// Backbone.Epoxy 0.x

// (c) 2013 Greg MacWilliam
// Epoxy may be freely distributed under the MIT license.
// For all details and documentation:
// http://epoxyjs.org

(function( Backbone, _ ) {
	
	Backbone.Epoxy = {};
	
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
			
			// Flag "init" to delay virtuals from self-initializing:
			this._init = true;
			
			// Add all virtual properties:
			if ( this.virtuals ) {
				_.each(this.virtuals, function( value, property ) {
					this.addVirtual( property, value );
				}, this);
			}
			
			// Add all virtual computed properties:
			if ( this.computeds ) {
				_.each(this.computeds, function( param, property ) {
					this.addComputed( property, param );
				}, this);
			}
			
			// Initialize all virtual properties:
			_.each(this.obs, function( virtual, property ) {
				virtual.init();
			});
			
			// Unflag "init": virtuals will now self-initialize.
			delete this._init;
		},
		
		// Backbone.Model.get() override:
		// accesses virtual properties & maps computed dependency bindings.
		get: function( property ) {
			
			// Automatically register bindings while building a computed dependency graph:
			if ( EpoxyModel._map ) {
				EpoxyModel._map.push( [property, this] );
			}
			
			// Return observable property value, if available:
			if ( this.hasVirtual(property) ) {
				return this.obs[ property ].get();
			}
			
			// Default to normal Backbone.Model getter:
			return this._super( "get", arguments );
		},
		
		// Backbone.Model.set() override:
		// processes virtualized properties, then passes result through to underlying model.
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
				// Test all setting properties against virtualized properties:
				// replace all virtualized fields with their mutated value(s).
				params = this._vset(params, {}, []);
			}
			
			return this._super( "set", [params, options] );
		},
		
		// Recursive virtual value setter/collector:
		// Used to collect non-virtual properties that will be passed along to the model,
		// and allows virtual properties to set one another in the process.
		// @param toTest: an object of key/value pairs to scan through.
		// @param toKeep: non-virtual properties to keep and eventually pass along to the model.
		// @param trace: property stack trace; prevents circular setter loops.
		_vset: function( toTest, toKeep, stack ) {
			
			// Loop through all test properties:
			for ( var property in toTest ) {
				if ( toTest.hasOwnProperty(property) ) {
					
					// Pull each test value:
					var value = toTest[ property ];
					
					if ( this.hasVirtual(property) ) {
						
						// Has a virtual property:
						// comfirm property does not already exist within the stack trace.
						if ( !stack.length || _.indexOf(stack, property) < 0 ) {
							
							// Non-recursive:
							// set and collect value from virtual property. 
							value = this.obs[property].set(value);
							
							// Recursively set new values for a returned params object:
							// creates a new copy of the stack trace for each new search branch.
							if ( value && typeof value == "object" ) {
								toKeep = this._vset( value, toKeep, stack.slice().concat([property]) );
							}
							
						} else {
							// Recursive:
							// Throw circular reference error.
							throw( "Recursive setter: "+stack.join(" > ") );
						}
						
					} else {
						// No virtual property:
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
			this.clearVirtuals();
			return this._super( "destroy", arguments );
		},
		
		// Adds a virtual property to the model:
		// virtual property values may contain any object type.
		addVirtual: function( property, value ) {
			this.removeVirtual( property );
			this.obs[ property ] = new EpoxyModel.VirtualProperty( this, property, {value: value} );
		},
		
		// Adds a virtual computed property to the model:
		// computed properties will construct customized values.
		// @param property (string)
		// @param getter (function) OR params (object)
		// @param [setter (function)]
		// @param [dependencies ...]
		addComputed: function( property, getter, setter ) {
			this.removeVirtual( property );
			
			var params = getter;
			
			// Test if getter and/or setter are provided:
			if ( typeof getter == "function" ) {
				var depsIndex = 2;
				
				// Add getter param:
				params = {};
				params._get = getter;
				
				// Test for setter param:
				if ( typeof setter == "function" ) {
					params._set = setter;
					depsIndex++;
				}
				
				// Collect all additional arguments as dependency definitions:
				params.deps = Array.prototype.slice.call( arguments, depsIndex );
			}
			
			// Create new computed property:
			this.obs[ property ] = new EpoxyModel.VirtualProperty( this, property, params );
		},
		
		// Removes a virtual property from the model:
		removeVirtual: function( property ) {
			if ( this.hasVirtual(property) ) {
				this.obs[ property ].dispose();
				delete this.obs[ property ];
			}
		},
		
		// Tests the model for a virtual property definition:
		hasVirtual: function( property ) {
			return this.obs.hasOwnProperty( property );
		},

		// Unbinds all virtual properties:
		clearVirtuals: function() {
			for ( var property in this.obs ) {
				this.removeVirtual( property );
			}
		}
	});
	
	// Epoxy.Model.VirtualProperty
	// ---------------------------
	var EpoxyVirtual = EpoxyModel.VirtualProperty = function( model, name, params ) {
		params = params || {};
		
		// Rewrite getter param:
		if ( params.get && typeof params.get == "function" ) {
			params._get = params.get;
		}
		
		// Rewrite setter param:
		if ( params.set && typeof params.set == "function" ) {
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
	
	_.extend(EpoxyVirtual.prototype, Backbone.Events, {
		dirty: true,
		deps: undefined,
		value: undefined,
		previous: undefined,
		
		init: function() {
			// Configure event capturing, then update and bind observable:
			EpoxyModel._map = this.deps;
			this.update();
			EpoxyModel._map = null;
			
			if ( this.deps.length ) {
				// Has dependencies:
				// proceed to binding...
				var bindings = {};
			
				// Compile normalized bindings array:
				// defines event types by name with their associated targets.
				_.each(this.deps, function( property ) {
					var target = this.model;
				
					// Unpack any provided array property as: [propName, target].
					if ( property instanceof Array ) {
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
		get: function() {
			if ( this.dirty && this._get ) {
				var val = this._get.call( this.model );
				this.change( val );
			}
			this.dirty = false;
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
		
		// Triggered in response to binding updates:
		// flags the value as dirty and re-gets it to update/propagate.
		update: function() {
			this.dirty = true;
			this.get();
		},
		
		// Fires a change event for the observable property on the parent model:
		fire: function() {
			this.model.trigger( "change change:"+this.name );
		},
		
		// Changes the observable's value:
		// new values are cached, then fire an update event.
		change: function( val ) {
			if ( val !== this.value ) {
				this.previous = this.value;
				this.value = val;
				this.fire();
			}
		},
		
		// Array operator method:
		// performs array ops on the observable value, then fires change.
		// The observable value must be an array for these actions to apply.
		_ary: function( operator, args ) {
			if ( this.value instanceof Array ) {
				var result = Array.prototype[ operator ].apply( this.value, args );
				this.fire();
			}
		},
		
		// Array operator methods:
		pop: function() {
			return this._ary( "pop", arguments );
		},
		
		push: function() {
			return this._ary( "push", arguments );
		},
		
		reverse: function() {
			return this._ary( "reverse", arguments );
		},
		
		shift: function() {
			return this._ary( "shift", arguments );
		},
		
		slice: function() {
			return this._ary( "slice", arguments );
		},
		
		sort: function() {
			return this._ary( "sort", arguments );
		},
		
		unshift: function() {
			return this._ary( "unshift", arguments );
		},
		
		// Disposal:
		// cleans up events and releases references.
		dispose: function() {
			this.stopListening();
			this.off();
			this.model = this.value = this.previous = null;
		}
	});
	
	// Epoxy.Model.ArrayVirtual
	/*/ ---------------------------
	EpoxyModel.ArrayVirtual = Virtual.extend({
		
		set: function( val, changed ) {
			// Test if lengths have changed:
			changed = changed || (this.value.length !== val.length);
			
			// If not, manually seach for value changes:
			if ( !changed ) {
				for (var i=0, len=val.length; i < len; i++) {
					if ( this.value[i] !== val[i] ) {
						changed = true;
						break;
					}
				}
			}
			
			// If changed, update:
			if ( changed ) {
				this.previous = this.value;
				this.value = val;
				this.change();
			}
		}
	});*/
	
	
	// Epoxy.defaultBindings
	// ---------------------
	Backbone.Epoxy.defaultBindings = {
		// Attribute: write-only. Sets element attributes.
		attr: {
			set: function( $element, value ) {
				$element.attr( value );
			}
		},
		
		// Checked: read-write. Toggles the checked status of a form element.
		checked: {
			get: function($element) {
				return $element.is(":radio") ? $element.val() : !!$element.prop("checked");
			},
			set: function($element, value) {
				var checked = $element.is(":radio") ? (value == $element.val()) : !!value;
				$element.prop("checked", checked);
			}
		},
		
		// Class Name: write-only. Toggles a collection of class name definitions.
		className: {
			set: function($element, value) {
				_.each(value, function(enabled, className) {
					$element.toggleClass(className, !!enabled);
				});
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
				$element.val( value );
			}
		}
	};
	
	
	// Epoxy.View
	// ----------
	var EpoxyView = Backbone.Epoxy.View = Backbone.View.extend({
		
		// Backbone.View.constructor override:
		// sets up binding controls, then runs super.
		constructor: function( options ) {
			// Create bindings list:
			this._xv = [];
			Backbone.View.prototype.constructor.call( this, arguments );
		},
		
		// Compiles model accessors, then applies bindings to the view:
		// Note: Model->View relationships are baked at the time of binding.
		// If model adds new properties or view adds new bindings, view must be re-bound.
		bindView: function() {
			this.unbindView();
			if ( !this.model || !this.bindings ) return;
			
			var operators = _.extend(this.operators || {}, Backbone.Epoxy.defaultBindings);
			var accessors = {};
			var model = this.model;
			var self = this;
			
			// Compile model accessors:
			// accessor functions will get, set, and map binding properties.
			_.each(_.extend({},model.attributes,model.obs||{}), function( value, property ) {
				accessors[ property ] = function( value ) {
					// Record property to binding map, when enabled:
					if ( EpoxyView._map ) {
						EpoxyView._map.push( "change:"+property );
					}
					
					// Get / Set value:
					if ( value !== void 0 ) {
						if ( value && typeof(value) == "object" ) return model.set( value );
						return model.set( property, value );
					}
					return model.get( property );
				};
			});
			
			// Binds an element into the model:
			function bind( $element, bindings, selector ) {
				// Try to compile bindings, throw errors if encountered:
				try {
					self._xv.push( new EpoxyView.Binding($element, bindings, accessors, operators, model) );
				} catch( error ) {
					throw( 'Error parsing bindings for "'+ selector +'" >> '+error );
				}
			}
			
			// Create bindings:
			if ( this.bindings && typeof this.bindings == "object" ) {
				
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
		unbindView: function() {
			while( this._xv.length ) {
				this._xv.pop().dispose();
			}
		},
	
		// Backbone.remove() override:
		// unbinds the view while removing.
		remove: function() {
			this.unbindView();
			Backbone.View.prototype.remove.call( this );
		}
	});
	
	
	// Epoxy.View.Binding
	// ------------------
	var Binding = EpoxyView.Binding = function( $element, bindings, accessors, operators, model ) {
		this.$el = $element;
		this.accessors = accessors;
		this.parser = new Function("$context", "with($context){return{" + bindings + "}}");
		this.parse();
		
		var self = this;
		var tag = ($element[0].tagName).toLowerCase();
		var changable = (tag == "input" || tag == "select" || tag == "textarea");
		
		_.each( self.bindings, function( accessor, operatorName ) {
			
			// Test if operator is defined:
			if ( operators.hasOwnProperty(operatorName) ) {
				// Create reference to binding operator:
				var operator = operators[ operatorName ];
				var events = [];
				
				// Set default binding:
				// Configure accessor table to collect events.
				EpoxyView._map = events;
				operator.set.call( self, self.$el, self.read(accessor) );
				EpoxyView._map = null;

				// Getting, requires:
				// => Form element.
				// => Binding operator has getter method.
				// => Value accessor is a function (dirty/composite bindings don't work here).
				if ( changable && operator.get && typeof(accessor) == "function" ) {
					self.$el.on(self.events, function() {
						accessor( operator.get.call( self, self.$el ) );
					});
				}
				
				// Setting, requires:
				// => One or more events triggers.
				if ( events.length ) {
					self.listenTo( model, events.join(" "), function() {
						operator.set.call( self, self.$el, self.read( accessor ) );
					});
				}
				
			} else {
				throw( "invalid binding => "+operator );
			}
			
		});
	};

	_.extend(Binding.prototype, Backbone.Events, {
		dirty: false,
		events: "change.epoxy",
		accessors: {},
		bindings: {},
		
		// Re-parses bindings table from the original parser function:
		// This method is only called once during construction,
		// then re-invoked each time a dirty binding is accessed.
		// An optional operator name may be specified for direct access to the parsed accessor.
		parse: function( operator ) {
			var bindings = this.bindings = this.parser( this.accessors );
			
			// Filter out triggers param:
			// Specifies dom triggers on which the DOM binding should update.
			// Binding triggers have a unique implementation, so should be parsed out...
			if ( bindings.events ) {
				var events = bindings.events;
				
				// Collect trigger definitions from an array:
				if ( events instanceof Array ) {
					
					// Enforce presence of a change trigger:
					if ( _.indexOf(events, "change") < 0 ) events.push("change");
					
					// Rewrite trigger string as "change.epoxy keydown.epoxy":
					this.events = _.map(events, function(name) {
						return name + ".epoxy";
					}).join(" ");
				}
				
				// delete from regular bindings collection.
				delete bindings.events;
			}
			
			if ( operator ) return bindings[ operator ];
		},
		
		// Reads value from an accessor:
		// Accessors come in three potential forms:
		// => A function to call for the requested value.
		// => An object with a collection of attribute accessors.
		// => A returned primitive; byproduct of a dirty binding.
		// This method unpacks an accessor and returns its underlying value(s).
		read: function( accessor ) {
			var type = typeof(accessor);
			
			if ( type == "function" ) {
				// Accessor is function: return invoked value.
				return accessor();
			}
			else if ( type && type == "object" ) {
				// Accessor is object: return copy with all attributes read.
				accessor = _.clone( accessor );
				
				_.each(accessor, function( valueAccessor, attr ) {
					accessor[ attr ] = this.read( valueAccessor );
				}, this);
				
				return accessor;
			} 
			
			// Something else...
			// Not sure what this is, so return the value directly.
			return accessor;
		},
		
		// Destroys the binding:
		// all events and 
		dispose: function() {
			this.stopListening();
			this.$el.off( this.events );
			this.$el = this.accessors = this.parser = null;
		}
	});
	
}( Backbone, _ ));