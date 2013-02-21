// Backbone.Epoxy 0.x

// (c) 2013 Greg MacWilliam
// Epoxy may be freely distributed under the MIT license.
// For all details and documentation:
// http://epoxyjs.org

;(function( Backbone, _ ) {
	
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
			
			// Adds all computed properties to the model:
			if ( this.computed ) {
				// Flag as initializing:
				this._init = true;
				
				// Add all computed properties:
				_.each(this.computed, function( param, property ) {
					this.addComputed( property, param );
				}, this);
				
				// Initialize all computed properties:
				_.each(this.obs, function( observable, property ) {
					observable.init();
				});
				
				// Unflag initialization:
				delete this._init;
			}
		},
		
		// Backbone.Model.get() override:
		// provides virtual properties & registers bindings while mapping computed dependencies.
		get: function( property ) {
			
			// Automatically register bindings while building a computed dependency graph:
			if ( EpoxyModel._map ) {
				EpoxyModel._map.push( [property, this] );
			}
			
			// Return observable property value, if available:
			if ( this.hasComputed(property) ) {
				return this.obs[ property ].get();
			}
			
			// Default to normal Backbone.Model getter:
			return this._super( "get", arguments );
		},
		
		// Backbone.Model.set() override:
		// defers to computed setters for defining writable values.
		set: function( key, value, options ) {
			var params = key;
			
			// Convert params into object key/value format:
			if ( typeof params != "object" ) {
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
				// Test all setting properties against the observable table:
				// replace all observable fields with their mutated value(s).
				_.each(params, function( val, property ) {	
					if ( this.hasComputed(property) ) {
						delete params[property];
						_.extend(params, this.obs[property].set(val) || {});
					}
				}, this);
			}
			
			return this._super( "set", [params, options] );
		},

		// Backbone.Model.destroy() override:
		// clears all computed properties before destroying.
		destroy: function() {
			this.clearComputed();
			return this._super( "destroy", arguments );
		},
		
		addObservable: function() {
			
		},
		
		addComputed: function( property, getter, setter ) {
			// Clear any existing property, then define new computed:
			this.removeComputed( property );
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
			
			// Create new computed observable:
			this.obs[ property ] = new EpoxyModel.Observable( this, property, params );
		},
		
		removeComputed: function( property ) {
			if ( this.hasComputed(property) ) {
				this.obs[ property ].dispose();
				delete this.obs[ property ];
			}
		},
		
		hasComputed: function( property ) {
			return this.obs.hasOwnProperty( property );
		},

		// Unbinds computed properties:
		clearComputed: function() {
			for ( var property in this.obs ) {
				this.removeComputed( property );
			}
		}
	});
	
	// Epoxy.Model.Observable
	// ----------------------
	var Observable = EpoxyModel.Observable = function( model, name, params ) {
		
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
		if ( !model._init ) this.init();
	};
	
	_.extend(Observable.prototype, Backbone.Events, {
		deps: undefined,
		value: undefined,
		previous: undefined,
		
		init: function() {
			// Configure event capturing, then update and bind observable:
			EpoxyModel._map = this.deps;
			this.update();
			this.bindings();
			EpoxyModel._map = null;
		},
		
		get: function() {
			return this.value;
		},
		
		set: function( val ) {
			if ( this._get ) {
				if ( this._set ) return this._set.apply( this.model, arguments );
				else throw( "Cannot set read-only computed observable." );
			}
			this.change( val );
		},
		
		update: function() {
			var val = this._get ? this._get.call( this.model ) : this.get();
			this.change( val );
		},
		
		change: function( val ) {
			if ( val !== this.value ) {
				this.previous = this.value;
				this.value = val;
				this.model.trigger( "change change:"+this.name );
			}
		},
		
		bindings: function() {
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
		},
		
		dispose: function() {
			this.off();
			this.stopListening();
			this.model = this.value = this.previous = null;
		}
	});
	
	// Epoxy.Model.ArrayObservable
	/*/ ---------------------------
	EpoxyModel.ArrayObservable = Observable.extend({
		
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
		},
		
		_op: function( operator, args ) {
			var result = Array.prototype[ operator ].apply( this.value, args );
			this.change();
			return 
		},
		pop: function() {
			return this._op( "pop", arguments );
		},
		push: function() {
			return this._op( "push", arguments );
		},
		reverse: function() {
			return this._op( "reverse", arguments );
		},
		shift: function() {
			return this._op( "shift", arguments );
		},
		slice: function() {
			return this._op( "slice", arguments );
		},
		sort: function() {
			return this._op( "sort", arguments );
		},
		unshift: function() {
			return this._op( "unshift", arguments );
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

			// Set passed options template:
			if ( options && options.template ) {
				this.template = options.template;
			}
			
			// Generate element dom from template:
			if ( this.template ) {
				var tmpl = this.template;
				tmpl = (typeof tmpl == "function") ? tmpl() : tmpl;
				this.el = this.$el = $( tmpl );
			}
			
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
						if ( typeof(value) == "object" ) return model.set( value );
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
					throw( 'Error parsing bindings for "'+ selector +'": '+error );
				}
			}
			
			// Create bindings:
			if ( typeof this.bindings == "object" ) {
				
				// Mapped bindings:
				_.each(this.bindings, function( bindings, selector ) {
					// Get DOM jQuery reference:
					var $el = this.$( selector );

					// Ignore missing DOM queries without throwing errors:
					if ( $el.length ) {
						bind( $el, bindings, selector );
					}
				}, this);
				
			} else {
				// Attribute bindings:
				var binding = this.bindings;
				
				this.$("["+ binding +"]").each(function() {
					var $el = $(this);
					bind( $el, $el.attr(binding), $el.attr("class") );
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
	EpoxyView.Binding = function( $element, bindings, accessors, operators, model ) {
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
				self.dirty = false;
				operator.set.call( self, self.$el, self.read(accessor) );
				EpoxyView._map = null;
				
				// Set dirty bindings flag:
				// a dirty binding performs value modifications within the binding declaration.
				// dirty bindings will require that bindings get reparsed after every change.
				// (dirty bindings are detected while evaluating accessor contents during initial setting op).
				var dirtyBinding = self.dirty;

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
						if ( dirtyBinding ) accessor = self.parse( operatorName );
						operator.set.call( self, self.$el, self.read( accessor ) );
					});
				}
				
			} else {
				throw( "invalid binding => "+operator );
			}
			
		});
	};

	EpoxyView.Binding.prototype = _.extend({
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
			else if ( type == "object" ) {
				// Accessor is object: return copy with all attributes read.
				accessor = _.clone( accessor );
				
				_.each(accessor, function( valueAccessor, attr ) {
					accessor[ attr ] = this.read( valueAccessor );
				}, this);
				
				return accessor;
			} 
			
			// Something else...
			// Not sure what this is, so flag as a dirty value and then return directly.
			this.dirty = true;
			return accessor;
		},
		
		// Destroys the binding:
		// all events and 
		dispose: function() {
			this.stopListening();
			this.$el.off( this.events );
			this.$el = null;
		}
		
	}, Backbone.Events);
	
}( Backbone, _ ));