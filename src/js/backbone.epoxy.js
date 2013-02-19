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
			this._com = {};
			this._super( "constructor", arguments );
			
			// Adds all computed properties to the model:
			if ( this.computed ) {
				_.each(this.computed, function( param, property ) {
					this.addComputed( property, param );
				}, this);
			}
		},
		
		// Backbone.Model.get() override:
		// provides virtual properties & registers bindings while mapping computed dependencies.
		get: function( property ) {
			
			if ( this.hasComputed(property) ) {
				// Requested property is computed:
				// return virtualized value, otherwise defer to standard get process.
				var computed = this._com[ property ];
				if ( computed.virtual ) return computed.value;

			} else if ( EpoxyModel._map ) {
				// Automatically register bindings into computed dependency graph:
				EpoxyModel._map[ "change:"+property ] = this;
			}
			
			return this._super( "get", arguments );
		},
		
		// Backbone.Model.set() override:
		// defers to computed setters for defining writable values.
		set: function( key, value, options ) {
			var args;
			
			if ( typeof key === "object" ) {
				options = value;
				value = key;
				
				// Form 2: {field0:"value0", field1:"value1"}
				// Test all setting properties against the computed table:
				// replace all computed fields with their mutated value(s).
				_.each(value, function( val, property ) {	
					
					if ( this.isSetter(property) && !options.unset ) {
						delete value[property];
						_.extend(value, this._com[property].set.call( this, val ));
					}
				
				}, this);
				
				args = [value, options];
				
			} else if ( this.isSetter(key) && !options.unset ) {
				// Form 1: "field", "value"
				// replace name and value args with definition of mutated value(s).
				args = [this._com[key].set.call(this, value), options];
			}
			
			return this._super( "set", args || arguments );
		},
		
		previous: function( property ) {
			if ( this.hasComputed(property) ) {
				return this._com[ property ].previous;
			}
			return this._super( "previous", arguments );
		},
		
		// Backbone.Model.destroy() override:
		// clears all computed properties before destroying.
		destroy: function() {
			this.clearComputed();
			return this._super( "destroy", arguments );
		},
		
		addComputed: function( property, param ) {
			// Clear any existing property, then define new computed:
			this.removeComputed( property );
			this._com[ property ] = new EpoxyModel.Computed( this, property, param );
		},
		
		removeComputed: function( property ) {
			if ( this.hasComputed(property) ) {
				this._com[ property ].dispose();
				delete this._com[ property ];
			}
		},
		
		hasComputed: function( property ) {
			return this._com.hasOwnProperty( property );
		},
		
		isGetter: function( property ) {
			if ( this.hasComputed(property) ) {
				return typeof this._com[ property ].get == "function";
			}
		},
		
		isSetter: function( property ) {
			if ( this.hasComputed(property) ) {
				return typeof this._com[ property ].set == "function";
			}
		},
		
		// Unbinds computed properties:
		clearComputed: function() {
			for ( var property in this._com ) {
				this.removeComputed( property );
			}
		}
	});
	
	
	// Epoxy.Model.Computed
	// --------------------
	EpoxyModel.Computed = function( model, name, param ) {

		// Set function param as getter, or extend with params object:
		if ( typeof param  == "function" ) this.get = param;
		else _.extend( this, param );

		// Set model and bindings table:
		this.name = name;
		this.model = model;
		this.events = this.events || {};
		
		// Publish events table for capture, then update property:
		EpoxyModel._map = this.events;
		this.update();
		EpoxyModel._map = null;

		// Bind all event declarations to their respective targets:
		_.each(this.events, function( target, eventType ) {
			this.listenTo( target, eventType, this.update );
			delete this.events[ eventType ];
		}, this);
	};

	EpoxyModel.Computed.prototype = _.extend({
		name: "",
		events: null,
		value: null,
		previous: null,
		virtual: false,
		
		// Getter and setter stubs:
		// to be filled in with functions.
		get: null,
		set: null,
		
		update: function() {
			this.previous = this.value;
			this.value = this.get.call( this.model );
			var changed = (this.value !== this.previous);
			
			if ( this.virtual ) {
				// Virtual value (does not write to model):
				// manually trigger change event when appropriate.
				changed && this.model.trigger( "change change:"+this.name );
			} else {
				// Standard value:
				// perform model set and let model sort out change.
				this.model._super( "set", [this.name, this.value] );
			}
		},
	
		dispose: function() {
			this.stopListening();
			if ( !this.virtual ) this.model.unset( this.name );
			this.model = null;
		}
		
	}, Backbone.Events);
	
	
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
			get: function( $element ) {
				return !!$element.prop( "checked" );
			},
			set: function( $element, value ) {
				$element.prop( "checked", !!value );
			}
		},
		
		// Class Name: write-only. Toggles a collection of class name definitions.
		className: {
			set: function( $element, value ) {
				_.each(value, function( enabled, className ) {
					$element.toggleClass( className, !!enabled );
				});
			}
		},
		
		// CSS: write-only. Sets a collection of CSS styles to an element.
		css: {
			set: function( $element, value ) {
				$element.css( value );
			}
		},
		
		// Enabled: write-only. Sets the "disabled" status of a form element.
		enabled: {
			set: function( $element, value ) {
				$element.prop( "disabled", !!value );
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
		constructor: function() {
			// Create bindings list:
			this._bindings = [];
			Backbone.View.prototype.constructor.call( this, arguments );
		},
		
		// Compiles model accessors, then applies bindings to the view:
		// Note: Model->View relationships are baked at the time of binding.
		// If model adds new properties or view adds new bindings, view must be completely re-bound.
		bindView: function() {
			this.unbindView();
			if ( !this.model || !this.bindings ) return;
		
			var operators = _.extend(this.operators || {}, Backbone.Epoxy.defaultBindings);
			var accessors = {};
			var model = this.model;
		
			// Compile model accessors:
			// accessor functions will get, set, and map binding properties.
			_.each(model.attributes, function( value, property ) {
				accessors[ property ] = function( value ) {
					// Record property to binding map, when enabled:
					if ( EpoxyView._map ) {
						EpoxyView._map.push( "change:"+property );
					}
					
					// Get / Set value:
					if ( value !== undefined ) {
						if ( typeof(value) == "object" ) return model.set( value );
						return model.set( property, value );
					}
					return model.get( property );
				};
			});
			
			// Create bindings:
			_.each(this.bindings, function( bindings, selector ) {
				// Get DOM jQuery reference:
				var $element = this.$( selector );
				
				// Ignore missing DOM queries without throwing errors:
				if ( $element.length ) {
					// Try to compile bindings, throw errors if encountered:
					try {
						this._bindings.push( new EpoxyView.Binding($element, bindings, accessors, operators, model) );
					} catch( error ) {
						throw( 'Error parsing bindings for "'+ selector +'": '+error );
					}
				}
			
			}, this);
		},
		
		// Disposes of all view bindings:
		unbindView: function() {
			while( this._bindings.length ) {
				this._bindings.pop().dispose();
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
					self.$el.on("change.epoxy", function() {
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
		accessors: {},
		bindings: {},
		
		// Re-parses bindings table from the original parser function:
		// This method is only called once during construction,
		// then re-invoked each time a dirty binding is accessed.
		// An optional operator name may be specified for direct access to the parsed accessor.
		parse: function( operator ) {
			this.bindings = this.parser( this.accessors );
			if ( operator ) return this.bindings[ operator ];
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
			this.$el.off( "change.epoxy" );
			this.$el = null;
		}
		
	}, Backbone.Events);
	
}( Backbone, _ ));

