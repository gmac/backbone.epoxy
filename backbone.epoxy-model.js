// Backbone.Epoxy 0.1

// (c) 2013 Greg MacWilliam
// Epoxy may be freely distributed under the MIT license.
// For all details and documentation:
// http://epoxyjs.org

(function( Backbone, _ ) {
	
	Backbone.Epoxy = Backbone.Epoxy || {};
	
	// Bindings Map:
	// stores an attributes binding map while configuring model bindings.
	var bindingsMap;
	
	
	// Epoxy.Model
	// -----------
	var EpoxyModel = Backbone.Epoxy.Model = Backbone.Model.extend({
		
		// Super class (Model) accessor:
		_super: function( method, args ) {
			return Backbone.Model.prototype[ method ].apply( this, args );
		},
		
		// Constructor function override:
		// configures computed model around default Backbone model.
		constructor: function() {
			this.obs = {};
			this._super( "constructor", arguments );
			
			// Flag "init" to delay observables from self-initializing:
			this._init = true;
			
			// Add all observable properties:
			if ( this.observables ) {
				_.each(this.observables, function( value, property ) {
					this.addObservable( property, value );
				}, this);
			}
			
			// Add all observable computed properties:
			if ( this.computeds ) {
				_.each(this.computeds, function( param, property ) {
					this.addComputed( property, param );
				}, this);
			}
			
			// Initialize all observable properties:
			_.each(this.obs, function( observable, property ) {
				observable.init();
			});
			
			// Unflag "init": observables will now self-initialize.
			delete this._init;
		},
		
		// Backbone.Model.get() override:
		// accesses observable properties & maps computed dependency bindings.
		get: function( property ) {
			
			// Automatically register bindings while building a computed dependency graph:
			if ( bindingsMap ) {
				bindingsMap.push( [property, this] );
			}
			
			// Return observable property value, if available:
			if ( this.hasObservable(property) ) {
				return this.obs[ property ].get();
			}
			
			// Default to normal Backbone.Model getter:
			return this._super( "get", arguments );
		},
		
		// Backbone.Model.set() override:
		// processes observableized properties, then passes result through to underlying model.
		set: function( key, value, options ) {
			var params = key;
			
			// Convert params into object key/value format:
			if ( params && typeof params != "object" ) {
				params = {};
				params[ key ] = value;
			} else {
				options = value;
			}
			
			// Set valid options definition:
			options = options || {};

			// While not unsetting:
			if ( !options.unset ) {
				// {field0:"value0", field1:"value1"}
				// Test all setting properties against observableized properties:
				// replace all observableized fields with their mutated value(s).
				params = this._deepset(params, {}, []);
			}
			
			return this._super( "set", [params, options] );
		},
		
		// Recursive observable value setter/collector:
		// Used to collect non-observable properties that will be passed along to the model,
		// and allows observable properties to set one another in the process.
		// @param toTest: an object of key/value pairs to scan through.
		// @param toKeep: non-observable properties to keep and eventually pass along to the model.
		// @param trace: property stack trace; prevents circular setter loops.
		_deepset: function( toTest, toKeep, stack ) {
			
			// Loop through all test properties:
			for ( var property in toTest ) {
				if ( toTest.hasOwnProperty(property) ) {
					
					// Pull each test value:
					var value = toTest[ property ];
					
					if ( this.hasObservable(property) ) {
						
						// Has a observable property:
						// comfirm property does not already exist within the stack trace.
						if ( !stack.length || _.indexOf(stack, property) < 0 ) {
							
							// Non-recursive:
							// set and collect value from observable property. 
							value = this.obs[property].set(value);
							
							// Recursively set new values for a returned params object:
							// creates a new copy of the stack trace for each new search branch.
							if ( value && typeof value == "object" ) {
								toKeep = this._deepset( value, toKeep, stack.slice().concat([property]) );
							}
							
						} else {
							// Recursive:
							// Throw circular reference error.
							throw( "Recursive setter: "+stack.join(" > ") );
						}
						
					} else {
						// No observable property:
						// set the value to the keeper values.
						toKeep[ property ] = value;
					}
				}
			}
			
			return toKeep;
		},
		
		// Backbone.Model.destroy() override:
		// clears all computed properties before destroying.
		destroy: function() {
			this.clearObservables();
			return this._super( "destroy", arguments );
		},
		
		// Adds a observable property to the model:
		// observable property values may contain any object type.
		addObservable: function( property, value ) {
			this.removeObservable( property );
			this.obs[ property ] = new EpoxyObservable( this, property, {value: value} );
		},
		
		// Adds a observable computed property to the model:
		// computed properties will construct customized values.
		// @param property (string)
		// @param getter (function) OR params (object)
		// @param [setter (function)]
		// @param [dependencies ...]
		addComputed: function( property, getter, setter ) {
			this.removeObservable( property );
			
			var params = getter;
			
			// Test if getter and/or setter are provided:
			if ( _.isFunction(getter) ) {
				var depsIndex = 2;
				
				// Add getter param:
				params = {};
				params._get = getter;
				
				// Test for setter param:
				if ( _.isFunction(setter) ) {
					params._set = setter;
					depsIndex++;
				}
				
				// Collect all additional arguments as dependency definitions:
				params.deps = Array.prototype.slice.call( arguments, depsIndex );
			}
			
			// Create new computed property:
			this.obs[ property ] = new EpoxyObservable( this, property, params );
		},
		
		// Tests the model for a observable property definition:
		hasObservable: function( property ) {
			return this.obs.hasOwnProperty( property );
		},
		
		// Gets an observable property definition:
		getObservable: function( property ) {
			if ( this.hasObservable(property) ) {
				return this.obs[ property ];
			}
			return null;
		},
		
		// Removes a observable property from the model:
		removeObservable: function( property ) {
			if ( this.hasObservable(property) ) {
				this.obs[ property ].dispose();
				delete this.obs[ property ];
			}
		},

		// Unbinds all observable properties:
		clearObservables: function() {
			for ( var property in this.obs ) {
				this.removeObservable( property );
			}
		}
	});
	
	// EpoxyObservable
	// ---------------
	var EpoxyObservable = function( model, name, params ) {
		params = params || {};
		
		// Rewrite getter param:
		if ( params.get && _.isFunction(params.get) ) {
			params._get = params.get;
		}
		
		// Rewrite setter param:
		if ( params.set && _.isFunction(params.set) ) {
			params._set = params.set;
		}
		
		// Prohibit override of "get()" and "set()", then extend:
		delete params.get;
		delete params.set;
		_.extend(this, params);
		
		// Set model, name, and default dependencies array:
		this.model = model;
		this.name = name;
		this.deps = this.deps || [];
		this.bindCustom();
		
		// Skip init while parent model is initializing:
		// Model will initialize in two passes...
		// the first pass sets up all binding definitions,
		// the second pass will initialize all bindings.
		if ( !model._init ) this.init();
	};
	
	_.extend(EpoxyObservable.prototype, Backbone.Events, {
		deps: undefined,
		value: undefined,
		custom: undefined,
		
		// Initializes the observable bindings:
		// this is called independently from the constructor so that the parent model
		// may perform a secondary init pass after constructing all observables.
		init: function() {
			// Configure event capturing, then update and bind observable:
			bindingsMap = this.deps;
			this.update();
			bindingsMap = null;
			
			if ( this.deps.length ) {
				// Has dependencies:
				// proceed to binding...
				var bindings = {};
			
				// Compile normalized bindings array:
				// defines event types by name with their associated targets.
				_.each(this.deps, function( property ) {
					var target = this.model;
				
					// Unpack any provided array property as: [propName, target].
					if ( _.isArray(property) ) {
						target = property[1];
						property = property[0];
					}
					
					// Normalize property names to include a "change:" prefix:
					if ( !!property.indexOf("change:") ) {
						property = "change:"+property;
					}

					// Populate event target arrays:
					if ( !bindings.hasOwnProperty(property) ) {
						bindings[property] = [ target ];
					
					} else if ( !_.contains(bindings[property], target) ) {
						bindings[property].push( target );
					}
				
				}, this);
			
				// Bind all event declarations to their respective targets:
				_.each(bindings, function( targets, binding ) {
					for (var i=0, len=targets.length; i < len; i++) {
						this.listenTo( targets[i], binding, this.update );
					}
				}, this);
			}
		},
		
		// Gets the observable's current value:
		// Computed values flagged as dirty will need to regenerate themselves.
		// Note: "dirty" is strongly checked as TRUE to prevent unintended arguments (handler events, etc) from qualifying.
		get: function( dirty ) {
			if ( dirty === true && this._get ) {
				var val = this._get.call( this.model );
				this.change( val );
			}
			return this.copy();
		},
		
		// Sets the observable's current value:
		// computed values (have a custom getter method) require a custom setter.
		// Custom setters should return an object of key/values pairs;
		// key/value pairs returned to the parent model will be merged into its main .set() operation.
		set: function( val ) {
			if ( this._get ) {
				if ( this._set ) return this._set.apply( this.model, arguments );
				else throw( "Cannot set read-only computed observable." );
			}
			this.change( val );
			return null;
		},
		
		// Updates the value with a dirty .get() operation:
		// triggered in response to binding updates.
		update: function() {
			this.get( true );
		},
		
		// Fires a change event for the observable property on the parent model:
		fire: function() {
			this.model.trigger( "change change:"+this.name );
		},
		
		// Returns a copy of the value object:
		copy: function() {
			var value = this.value;
			
			if ( this.custom ) {
				return this.custom;
			} else if ( _.isArray(value) ) {
				return value.slice();
			} else if ( _.isObject(value) ) {
				return _.clone(value);
			}
			return value;
		},
		
		// Changes the observable's value:
		// new values are cached, then fire an update event.
		change: function( value ) {
			if ( !_.isEqual(value, this.value) ) {
				this.value = value;
				this.bindCustom();
				
				// Fire update event:
				this.fire();
			}
		},
		
		// Update customized bindings:
		bindCustom: function() {
			var custom = this.custom;
			var value = this.value;

			// Unbind events on any deprecated custom reference:
			if ( custom && custom !== value ) {
				this.stopListening( custom );
				this.custom = null;
			}
			
			// If current value is a collection, bind to collection update events:
			if ( value instanceof Backbone.Collection ) {
				custom = this.custom = value;
				this.listenTo( custom, "add remove reset sort", this.fire );
				this.listenTo( custom, "destroy", _.bind(this.model.removeObservable, this.model, this.name) )
			}
		},
		
		// Specifies if the observable property is an Array instance:
		isArray: function() {
			return _.isArray(this.value);
		},
		
		// Array modifier method:
		// performs array ops on the observable (array) value, then fires change.
		// No action is taken if the observable value isn't an array.
		modifyArray: function( method ) {
			var array = Array.prototype;
			
			if ( this.isArray() && _.isFunction( array[method] ) ) {
				var args = array.slice.call( arguments, 1 );
				var result = array[ method ].apply( this.value, args );
				this.fire();
				return result;
			}
			return null;
		},
		
		// Disposal:
		// cleans up events and releases references.
		dispose: function() {
			this.stopListening();
			this.off();
			this.model = this.value = this.custom = null;
		}
	});
	
}( Backbone, _ ));