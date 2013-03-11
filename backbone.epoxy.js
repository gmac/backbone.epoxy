// Backbone.Epoxy

// (c) 2013 Greg MacWilliam
// Freely distributed under the MIT license.
// For usage and documentation:
// http://epoxyjs.org

(function() {
	
	// Operations scope:
	var root = this;
	var Backbone = root.Backbone;
	var _ = root._;
	
	
	// Epoxy namespace:
	var Epoxy = Backbone.Epoxy = {};
	
	
	// Object-type assessment utils:
	var array = Array.prototype;
	var isUndefined = _.isUndefined;
	var isFunction = _.isFunction;
	var isObject = _.isObject;
	var isArray = _.isArray;
	var isModel = function(obj) { return obj instanceof Backbone.Model; };
	var isCollection = function(obj) { return obj instanceof Backbone.Collection; };
	
	
	// Partial application for calling method implementations of a super-class object:
	function superClass( sup ) {
		return function( instance, method, args ) {
			return sup.prototype[ method ].apply( instance, args );
		};
	}
	
	
	// Epoxy.Model
	// -----------
	var modelMap;
	var modelSuper = superClass( Backbone.Model );
	
	Epoxy.Model = Backbone.Model.extend({
		
		// Constructor function override:
		// configures computed model around default Backbone model.
		constructor: function() {
			this.obs = {};
			modelSuper( this, "constructor", arguments );
			
			// Flag "init" to delay observables from self-initializing:
			this._init = true;
			
			// Add all observable properties:
			if ( this.observableDefaults ) {
				_.each(this.observableDefaults, function( value, attribute ) {
					this.addObservable( attribute, isFunction(value) ? value() : value );
				}, this);
			}
			
			// Add all observable computed properties:
			if ( this.computeds ) {
				_.each(this.computeds, function( param, attribute ) {
					this.addComputed( attribute, param );
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
		get: function( attribute ) {
			
			// Automatically register bindings while building a computed dependency graph:
			modelMap && modelMap.push( [attribute, this] );
			
			// Return observable property value, if available:
			if ( this.hasObservable(attribute) ) {
				return this.obs[ attribute ].get();
			}
			
			// Default to normal Backbone.Model getter:
			return modelSuper( this, "get", arguments );
		},
		
		// Gets a copy of a model attribute value:
		// Arrays and Object values will return a shallow clone,
		// primitive values will be returned directly.
		getCopy: function( attribute ) {
			var value = this.get( attribute );
			
			if ( isArray(value) ) {
				return value.slice();
			} else if ( isObject(value) ) {
				return _.clone(value);
			}
			return value;
		},
		
		// Backbone.Model.set() override:
		// processes observableized properties, then passes result through to underlying model.
		set: function( key, value, options ) {
			var params = key;
			
			// Convert params into object key/value format:
			if ( params && !isObject(params) ) {
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
				params = modelDeepSet(this, params, {}, []);
			}
			
			return modelSuper( this, "set", [params, options] );
		},
		
		// Backbone.Model.destroy() override:
		// clears all computed properties before destroying.
		destroy: function() {
			this.clearObservables();
			return modelSuper( this, "destroy", arguments );
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
			if ( isFunction(getter) ) {
				var depsIndex = 2;
				
				// Add getter param:
				params = {};
				params._get = getter;
				
				// Test for setter param:
				if ( isFunction(setter) ) {
					params._set = setter;
					depsIndex++;
				}
				
				// Collect all additional arguments as dependency definitions:
				params.deps = array.slice.call( arguments, depsIndex );
			}
			
			// Create new computed property:
			this.obs[ property ] = new EpoxyObservable( this, property, params );
		},
		
		// Tests the model for a observable property definition:
		hasObservable: function( attribute ) {
			return this.obs.hasOwnProperty( attribute );
		},
		
		// Removes a observable property from the model:
		removeObservable: function( attribute ) {
			if ( this.hasObservable(attribute) ) {
				this.obs[ attribute ].dispose();
				delete this.obs[ attribute ];
			}
		},

		// Unbinds all observable properties:
		clearObservables: function() {
			for ( var attribute in this.obs ) {
				this.removeObservable( attribute );
			}
		},
		
		// Array attribute modifier method:
		// performs array ops on an array attribute, then fires change.
		// No action is taken if the attribute value isn't an array.
		modifyArray: function( attribute, method ) {
			var obj = this.get( attribute );
			
			if ( isArray(obj) && isFunction(array[method]) ) {
				var args = array.slice.call( arguments, 2 );
				var result = array[ method ].apply( obj, args );
				this.trigger( "change change:"+attribute );
				return result;
			}
			return null;
		},
		
		// Object attribute modifier method:
		// sets new object property values, then fires change.
		// No action is taken if the observable value isn't an object.
		modifyObject: function( attribute, property, value ) {
			var obj = this.get( attribute );
			var change = false;
			
			// If property is an Object:
			if ( isObject(obj) ) {
				
				// Delete existing property in response to undefined values:
				if ( isUndefined(value) && obj.hasOwnProperty(property) ) {
					delete obj[property];
					change = true;
				}
				// Set new and/or changed property values:
				else if ( obj[ property ] !== value ) {
					obj[ property ] = value;
					change = true;
				}
				
				// Trigger model change:
				if (change) {
					this.trigger( "change change:"+attribute );
				}
				
				// Return the modified object:
				return obj;
			}
			return null;
		}
	});

	
	// Model deep-setter:
	// Used to collect returns from observable setters that will pass back model attributes,
	// and allows observable attributes to set one another in the process.
	// @param model: target Epoxy model on which to operate.
	// @param toTest: an object of key/value pairs to scan through.
	// @param toKeep: non-observable properties to keep and eventually pass along to the model.
	// @param trace: property stack trace; prevents circular setter loops.
	function modelDeepSet( model, toTest, toKeep, stack ) {
		
		// Loop through all test properties:
		for ( var property in toTest ) {
			if ( toTest.hasOwnProperty(property) ) {
				
				// Pull each test value:
				var value = toTest[ property ];
				
				if ( model.hasObservable(property) ) {
					
					// Has a observable property:
					// comfirm property does not already exist within the stack trace.
					if ( !stack.length || _.indexOf(stack, property) < 0 ) {
						
						// Non-recursive:
						// set and collect value from observable property. 
						value = model.obs[property].set(value);
						
						// Recursively set new values for a returned params object:
						// creates a new copy of the stack trace for each new search branch.
						if ( value && isObject(value) ) {
							toKeep = modelDeepSet( model, value, toKeep, stack.slice().concat([property]) );
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
	}
	
	
	// Epoxy.Model -> Observable
	// -------------------------
	var EpoxyObservable = function( model, name, params ) {
		params = params || {};
		
		// Rewrite getter param:
		if ( params.get && isFunction(params.get) ) {
			params._get = params.get;
		}
		
		// Rewrite setter param:
		if ( params.set && isFunction(params.set) ) {
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
		
		// Skip init while parent model is initializing:
		// Model will initialize in two passes...
		// the first pass sets up all binding definitions,
		// the second pass will initialize all bindings.
		if ( !model._init ) this.init();
	};
	
	_.extend(EpoxyObservable.prototype, Backbone.Events, {
		// Initializes the observable bindings:
		// this is called independently from the constructor so that the parent model
		// may perform a secondary init pass after constructing all observables.
		init: function() {
			// Configure event capturing, then update and bind observable:
			modelMap = this.deps;
			this.get( true );
			modelMap = null;
			
			if ( this.deps.length ) {
				// Has dependencies:
				// proceed to binding...
				var bindings = {};
			
				// Compile normalized bindings array:
				// defines event types by name with their associated targets.
				_.each(this.deps, function( property ) {
					var target = this.model;
				
					// Unpack any provided array property as: [propName, target].
					if ( isArray(property) ) {
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
						this.listenTo( targets[i], binding, _.bind(this.get, this, true) );
					}
				}, this);
			}
		},
		
		// Gets the observable's current value:
		// Computed values flagged as dirty will need to regenerate themselves.
		// Note: "update" is strongly checked as TRUE to prevent unintended arguments (handler events, etc) from qualifying.
		get: function( update ) {
			if ( update === true && this._get ) {
				var val = this._get.call( this.model );
				this.change( val );
			}
			return this.value;
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
		
		// Fires a change event for the observable property on the parent model:
		fire: function() {
			this.model.trigger( "change change:"+this.name );
		},

		// Changes the observable's value:
		// new values are cached, then fire an update event.
		change: function( value ) {
			if ( !_.isEqual(value, this.value) ) {
				this.value = value;
				this.fire();
			}
		},
		
		// Disposal:
		// cleans up events and releases references.
		dispose: function() {
			this.stopListening();
			this.off();
			this.model = this.value = null;
		}
	});
	
	
	// Epoxy.View
	// ----------
	var viewMap;
	var viewSuper = superClass( Backbone.View );
	
	Epoxy.View = Backbone.View.extend({
		
		// Backbone.View.constructor override:
		// sets up binding controls, then runs super.
		constructor: function( options ) {
			// Create bindings list:
			this._bind = [];
			viewSuper( this, "constructor", arguments );
			this.applyBindings();
		},
		
		// Default bindings definition: provides a DOM element attribute to query.
		bindings: "data-bind",
		
		// Compiles a model context, then applies bindings to the view:
		// Note: Model->View relationships are baked at the time of binding.
		// If model adds new properties or view adds new bindings, view must be re-bound.
		applyBindings: function() {
			this.removeBindings();
			if (!this.model && !this.collection) return;
			
			var self = this;
			var sources = this.bindingSources;
			var handlers = _.clone( bindingHandlers );
			var context = {};
			
			// Compile custom binding handler definitions:
			// assigns raw functions as setter definitions by default.
			_.each(self.bindingHandlers||{}, function( handler, name ) {
			    handlers[ name ] = isFunction(handler) ? {set: handler} : handler;
			});
			
			// Add directly-referenced model and collection sources:
			self.model = addSourceToContext( self.model, context );
			self.collection = addSourceToContext( self.collection, context );
			
			// Add additional sources...
			_.each(sources, function( source, sourceName ) {
				sources[ sourceName ] = addSourceToContext( source, context, sourceName );
			});
			
			// Binds an element onto the model:
			function bind( $element, bindings, selector ) {
				// Try to compile bindings, throw errors if encountered:
				try {
					self._bind.push(new EpoxyBinding($element, bindings, context, handlers));
				} catch( error ) {
					throw( 'Error parsing bindings for "'+ selector +'" >> '+error );
				}
			}
			
			// Create bindings:
			if ( isObject(this.bindings) ) {
				
				// Mapped bindings:
				_.each(this.bindings, function( bindings, selector ) {
					// Get DOM jQuery reference:
					var $nodes = this.$( selector );

					// Include top-level view in bindings search:
					if ( this.$el.is(selector) ) {
						$nodes = $nodes.add( this.$el );
					}
					
					// Ignore missing DOM queries without throwing errors:
					if ( $nodes.length ) {
						bind( $nodes, bindings, selector );
					}
				}, this);
				
			} else {
				// Attribute bindings:
				var bindings = this.bindings;
				var selector = "["+ bindings +"]";
				var $nodes = this.$( selector );

				// Include top-level view in bindings search:
				if ( this.$el.is(selector) ) {
					$nodes = $nodes.add( this.$el );
				}
				
				$nodes.each(function( $el ) {
					$el = $(this);
					bind( $el, $el.attr(bindings), selector );
				});
			}
		},
		
		// Disposes of all view bindings:
		removeBindings: function() {
			while( this._bind.length ) {
				this._bind.pop().dispose();
			}
		},
	
		// Backbone.remove() override:
		// unbinds the view while removing.
		remove: function() {
			this.removeBindings();
			viewSuper( this, "remove" );
		}
	});
	
	
	// Adds a data source to a view:
	// Data sources are Backbone.Model and Backbone.Collection instances.
	// @param source: a source instance, or a function that returns a source.
	// @param context: the working binding context. All bindings in a view share a context.
	function addSourceToContext( source, context, name ) {
		
		// Abort on missing sources, or construct non-instance
		if (!source) return;
		else if (isFunction(source)) source = source();
		
		// Add Backbone.Model source instance:
		if ( isModel(source) ) {
			
			// Establish source prefix:
			var prefix = name ? name+"_" : "";
			
			// Compile table of all source attributes (native and observable):
			var attrs = _.extend({}, source.attributes, source.obs||{});
			
			// Create special read-only model accessor for source instance:
			context[ "$"+(name||"model") ] = function() {
				viewMap && viewMap.push([source, "change"]);
				return source;
			};
			
			// Compile all source attributes as accessors within the context:
			_.each(attrs, function(value, attribute) {
				// Create named accessor function:
				// -> Direct view.model attributes use normal names.
				// -> Attributes from additional sources are named as "source_attribute".
				context[ prefix+attribute ] = function( value ) {
					// Record property to binding map, when enabled:
					viewMap && viewMap.push([source, "change:"+attribute]);

					// Get / Set value:
					if ( !isUndefined(value) ) {
						if ( isObject(value) && !isArray(value) ) {
							// Set Object (non-null, non-array) hashtable value:
							return source.set( value );
						}
						// Set single property/value pair:
						return source.set( attribute, value );
					}
					return source.get( attribute );
				};
			});
			
		}
		// Add Backbone.Collection source instance:
		else if ( isCollection(source) ) {
			
			// Create special read-only collection accessor:
			context[ "$"+(name||"collection") ] = function() {
				viewMap && viewMap.push([source, "reset add remove sort"]);
				return source;
			};
		}
		
		return source;
	}
	
	
	// readAccessor()
	// --------------
	// Reads value from an accessor:
	// Accessors come in three potential forms:
	// => A function to call for the requested value.
	// => An object with a collection of attribute accessors.
	// => A primitive (string, number, boolean, etc).
	// This method unpacks an accessor and returns its underlying value(s).
	function readAccessor( accessor ) {
		
		if ( isFunction(accessor) ) {
			// Accessor is function: return invoked value.
			return accessor();
		}
		else if ( isObject(accessor) ) {
			// Accessor is object: return copy with all attributes read.
			accessor = isArray(accessor) ? accessor.slice() : _.clone(accessor);
			
			_.each(accessor, function( value, key ) {
				accessor[ key ] = readAccessor( value );
			});
		}
		// return formatted value, or pass through primitives:
		return accessor;
	}
	
	
	// binding handlers
	// ----------------
	var bindingHandlers = {
		// Attribute: write-only. Sets element attributes.
		attr: {
			set: function( $element, value ) {
				$element.attr( value );
			}
		},
		
		// Checked: read-write. Toggles the checked status of a form element.
		checked: {
			get: function( $element, currentValue ) {
				var checked = !!$element.prop( "checked" );
				var value = $element.val();
				
				if ( $element.is(":radio") ) {
					// Radio button: return value directly.
					return value;
					
				} else if ( isArray(currentValue) ) {
					// Checkbox array: add/remove value from list.
					currentValue = currentValue.slice();
					var index = _.indexOf(currentValue, value);

					if ( checked && index < 0 ) {
						currentValue.push( value );
					} else if ( !checked && index > -1 ) {
						currentValue.splice(index, 1);
					}
					return currentValue;
				}
				// Checkbox: return boolean toggle.
				return checked;
			},
			set: function( $element, value ) {
				// Default as loosely-typed boolean:
				var checked = !!value;
				
				if ( $element.is(":radio") ) {
					// Radio button: match checked state to radio value.
					checked = (value == $element.val());
					
				} else if ( isArray(value) ) {
					// Checkbox array: match checked state to checkbox value in array contents.
					checked = _.contains(value, $element.val());
				}
				
				// Set checked property to element:
				$element.prop("checked", checked);
			}
		},
		
		// Class Name: write-only. Toggles a collection of class name definitions.
		classes: {
			set: function( $element, value ) {
				_.each(value, function(enabled, className) {
					$element.toggleClass(className, !!enabled);
				});
			}
		},
		
		// Collection: write-only. Manages a list of views bound to a Backbone.Collection.
		collection: {
			set: function( $element, collection, target ) {
				
				// Requires a valid collection argument with an associated view:
				if ( isCollection(collection) && isFunction(collection.view) ) {
					
					var models = collection.models;
					var views = this.v;
					var view;
					
					// Default target to the bound collection object:
					// during init (or failure), the binding will reset.
					target = target || collection;

					if ( isModel(target) ) {
						
						// ADD/REMOVE Event (from a Model):
						// test if view exists within the binding...
						if ( !views.hasOwnProperty(target.cid) ) {
							
							// Add new view:
							views[ target.cid ] = view = new collection.view({model: target});
							var index = _.indexOf(models, target);
							
							// Attempt to add at proper index,
							// otherwise just append into the element.
							if ($element.children().length < index) {
								$element.eq( index ).before( view.$el );
							} else {
								$element.append( view.$el );
							}
							
						} else {
							
							// Remove existing view:
							view = views[ target.cid ];
							view.remove();
							delete views[ target.cid ];
						}
						
					} else if ( isCollection(target) ) {
						
						// SORT/RESET Event (from a Collection):
						// First test if we're sorting (all views are present):
						var sort = _.every(models, function( model ) {
							return views.hasOwnProperty(model.cid);
						});
						
						// Hide element before manipulating:
						$element.hide();
						
						if ( sort ) {
							// Sort existing views:
							collection.each(function( model ) {
								$element.append( views[model.cid].$el );
							});
							
						} else {
							// Reset with new views:
							this.empty();
							
							collection.each(function( model ) {
								views[ model.cid ] = view = new collection.view({model: model});
								$element.append( view.$el );
							});
						}
						
						// Show element after manipulating:
						$element.show();
					}
					
				} else {
					// Throw error for invalid binding params:
					throw( "Binding 'collection:' requires a Collection with a 'view' constructor." );
				}
			}
		},
		
		// CSS: write-only. Sets a collection of CSS styles to an element.
		css: {
			set: function( $element, value ) {
				$element.css( value );
			}
		},

		// Disabled: write-only. Sets the "disabled" status of a form element (true :: disabled).
		disabled: {
			set: function( $element, value ) {
				$element.prop( "disabled", !!value );
			}
		},
		
		// Enabled: write-only. Sets the "disabled" status of a form element (true :: !disabled).
		enabled: {
			set: function( $element, value ) {
				$element.prop( "disabled", !value );
			}
		},
		
		// HTML: write-only. Sets the inner HTML value of an element.
		html: {
			set: function( $element, value ) {
				$element.html( value );
			}
		},
		
		// Text: write-only. Sets the text value of an element.
		text: {
			set: function( $element, value ) {
				$element.text( value );
			}
		},
		
		// Toggle: write-only. Toggles the visibility of an element.
		toggle: {
			set: function( $element, value ) {
				$element.toggle( !!value );
			}
		},
		
		// Value: read-write. Gets and sets the value of a form element.
		value: {
			get: function( $element ) {
				return $element.val();
			},
			set: function( $element, value ) {
				if ( $element.val() != value ) $element.val( value );
			}
		}
	};
	
	// binding operators
	// -----------------
	// Operators are special binding handlers that may be invoked while binding;
	// they will return a wrapper function used to modify how accessors are read.
	// **IMPORTANT:
	// Binding operators must access ALL of their dependent params while running,
	// otherwise accessor params become unreachable and will not provide binding hooks.
	// Therefore, assessment loops must NOT exit early... so do not optimize!
	var bindingOperators = {
		// Tests if all of the provided accessors are truthy (and):
		all: function() {
			var params = arguments;
			return function() {
				var result = true;
				for ( var i=0, len=params.length; i < len; i++ ) {
					if ( !readAccessor(params[i]) ) result = false;
				}
				return result;
			}
		},
	
		// Tests if any of the provided accessors are truthy (or):
		any: function() {
			var params = arguments;
			return function() {
				var result = false;
				for ( var i=0, len=params.length; i < len; i++ ) {
					if ( readAccessor(params[i]) ) result = true;
				}
				return result;
			}
		},
	
		// Tests if none of the provided accessors are truthy (and not):
		none: function() {
			var params = arguments;
			return function() {
				var result = true;
				for ( var i=0, len=params.length; i < len; i++ ) {
					if ( readAccessor(params[i]) ) result = false;
				}
				return result;
			}
		},
	
		// Negates an accessor's value:
		not: function( accessor ) {
			return function() {
				return !readAccessor( accessor );
			}
		},
	
		// Formats one or more accessors into a text string:
		// ("$1 $2 did $3", firstName, lastName, action)
		format: function() {
			var params = arguments;
			return function() {
				var str = readAccessor(params[0]);
				for ( var i=1, len=params.length; i < len; i++ ) {
					str = str.replace( "$"+i, readAccessor(params[i]) );
				}
				return str;
			}
		},
		
		// Provides one of two values based on a ternary condition:
		// uses first param (a) as condition, and returns either b (true) or c (false).
		select: function() {
			var params = arguments;
			return function() {
				var a = readAccessor(params[0]);
				var b = readAccessor(params[1]);
				var c = readAccessor(params[2]);
				return a ? b : c;
			}
		}
	};
	
	// Epoxy.View -> Binding
	// ---------------------
	var EpoxyBinding = function( $element, bindings, context, handlers ) {
		this.$el = $element;
		this.v = {};
		
		var self = this;
		var tag = ($element[0].tagName).toLowerCase();
		var changable = (tag == "input" || tag == "select" || tag == "textarea");
		var parser = new Function("$o", "$a", "with($o){with($a){return{"+ bindings +"}}}");
		var events = ["change"];
		
		// Parse all bindings to a hash table of accessor functions:
		bindings = parser( bindingOperators, context );
		
		// Collect additional event bindings param from parsed bindings:
		// specifies dom triggers on which the DOM binding should update.
		if ( bindings.events ) {
			events = isArray(bindings.events) ? _.union(events, bindings.events) : events;
			delete bindings.events;
		}
		
		// Define event triggers list:
		this.events = _.map(events, function(name){ return name+".epoxy"; }).join(" ");
		
		// Apply event bindings:
		_.each(bindings, function( accessor, handlerName ) {
			
			// Test if handler is defined:
			if ( handlers.hasOwnProperty(handlerName) ) {
				// Create reference to binding handler:
				var handler = handlers[ handlerName ];
				var triggers = [];
				
				// Set default binding:
				// Configure accessor table to collect events.
				viewMap = triggers;
				handler.set.call(self, self.$el, readAccessor(accessor));
				viewMap = null;
				
				// READ/GET, requires:
				// => Form element.
				// => Binding handler has getter method.
				// => Value accessor is a function.
				if ( changable && handler.get && isFunction(accessor) ) {
					self.$el.on(self.events, function() {
						accessor( handler.get.call(self, self.$el, readAccessor(accessor)) );
					});
				}
				
				// WRITE/SET, requires:
				// => One or more events triggers.
				if ( triggers.length ) {
					var onUpdate = function(target) {
						handler.set.call(self, self.$el, readAccessor(accessor), target);
					};
					
					for (var i=0, len=triggers.length; i < len; i++) {
						self.listenTo(triggers[i][0], triggers[i][1], onUpdate);
					}
				}
				
			} else {
				// Operator was undefined:
				throw( "invalid binding => "+handlerName );
			}
		});
	};

	_.extend(EpoxyBinding.prototype, Backbone.Events, {
		// Empties all stored sub-views from the binding:
		empty: function() {
			for (var view in this.v) {
				if ( this.v.hasOwnProperty(view) ) {
					view.remove();
					delete this.v[ view ];
				}
			}
		},
		
		// Destroys the binding:
		// all events and managed sub-views are killed.
		dispose: function() {
			this.empty();
			this.stopListening();
			this.$el.off( this.events );
			this.$el = null;
		}
	});
	
}).call( this );