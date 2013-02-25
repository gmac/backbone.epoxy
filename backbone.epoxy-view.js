// Backbone.Epoxy 0.1

// (c) 2013 Greg MacWilliam
// Epoxy may be freely distributed under the MIT license.
// For all details and documentation:
// http://epoxyjs.org

(function( Backbone, _ ) {
	
	Backbone.Epoxy = Backbone.Epoxy || {};
	
	// Epoxy.View
	// ----------
	var EpoxyView = Backbone.Epoxy.View = Backbone.View.extend({
		
		// Backbone.View.constructor override:
		// sets up binding controls, then runs super.
		constructor: function( options ) {
			// Create bindings list:
			this._bind = [];
			Backbone.View.prototype.constructor.call( this, arguments );
			this.applyBindings();
		},
		
		// Compiles model accessors, then applies bindings to the view:
		// Note: Model->View relationships are baked at the time of binding.
		// If model adds new properties or view adds new bindings, view must be re-bound.
		applyBindings: function() {
			this.removeBindings();
			if ( !this.model || !this.bindings ) return;
			
			var self = this;
			var model = this.model;
			var accessors = {};
			var handlers = _.clone( defaultHandlers );
			
			// Compile custom handler definitions:
			// assigns raw functions as setter definitions by default.
			_.each(this.handlers, function( handler, name ) {
			    handlers[ name ] = _.isFunction(handler) ? {set: handler} : handler;
			});
			
			// Compile model accessors:
			// accessor functions will get, set, and map binding properties.
			_.each(_.extend({},model.attributes,model.obs||{}), function( value, property ) {
				accessors[ property ] = function( value ) {
					// Record property to binding map, when enabled:
					if ( EpoxyView._map ) {
						EpoxyView._map.push( "change:"+property );
					}
					
					// Get / Set value:
					if ( !_.isUndefined(value) ) {
						if ( value && _.isObject(value) && !_.isArray(value) ) {
							// Set Object (non-null, non-array) hashtable value:
							return model.set( value );
						}
						// Set single property/value pair:
						return model.set( property, value );
					}
					return model.get( property );
				};
			});
			
			// Binds an element onto the model:
			function bind( $element, bindings, selector ) {
				// Try to compile bindings, throw errors if encountered:
				try {
					self._bind.push( new EpoxyBinding($element, bindings, accessors, handlers, model) );
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
		removeBindings: function() {
			while( this._bind.length ) {
				this._bind.pop().dispose();
			}
		},
	
		// Backbone.remove() override:
		// unbinds the view while removing.
		remove: function() {
			this.removeBindings();
			Backbone.View.prototype.remove.call( this );
		}
	});
	
	
	// defaultHandlers
	// ---------------
	var defaultHandlers = {
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
					
				} else if ( _.isArray(currentValue) ) {
					// Checkbox array: add/remove value from list.
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
					
				} else if ( _.isArray(value) ) {
					// Checkbox array: match checked state to checkbox value in array contents.
					checked = _.contains(value, $element.val());
				}
				
				// Set checked property to element:
				$element.prop("checked", checked);
			}
		},
		
		// Class Name: write-only. Toggles a collection of class name definitions.
		className: {
			set: function( $element, value ) {
				_.each(value, function(enabled, className) {
					$element.toggleClass(className, !!enabled);
				});
			}
		},
		
		// Collection: write-only. Manages a list of views bound to a Backbone.Collection.
		collection: {
			set: function( $element, collection ) {
				// Requires a valid collection argument with an associated view:
				if ( collection instanceof Backbone.Collection && _.isFunction(collection.view) ) {
					
					//console.log( collection.lastEvent );
					
					// Create staging container, and empty the element:
					var $staging = $( "<div/>" );
					$element.empty();
				
					// Loop through all models, creating missing views and staging new order:
					collection.each(function(model, index) {
						if ( !model.view ) {
							model.view = new collection.view({model: model});
						}
						$staging.append( model.view.$el );
					});
				
					// Push staging order out to the main element view:
					$element.append( $staging.children() );
				} else {
					// Throw error for invalid binding params:
					throw( "Binding 'collection:' requires a Backbone.Collection with a '.view' property." );
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
				$element.val( value );
			}
		}
	};
	
	
	// readAccessor()
	// --------------
	// Reads value from an accessor:
	// Accessors come in three potential forms:
	// => A function to call for the requested value.
	// => An object with a collection of attribute accessors.
	// => A primitive (string, number, boolean, etc).
	// This method unpacks an accessor and returns its underlying value(s).
	function readAccessor( accessor ) {
		
		if ( _.isFunction(accessor) ) {
			// Accessor is function: return invoked value.
			return accessor();
		}
		else if ( _.isObject(accessor) ) {
			// Accessor is object: return copy with all attributes read.
			accessor = _.isArray(accessor) ? accessor.slice() : _.clone(accessor);
			
			_.each(accessor, function( value, key ) {
				accessor[ key ] = readAccessor( value );
			});
		}
		// return formatted value, or pass through primitives:
		return accessor;
	}
	
	
	// bindingFormatters
	// -----------------
	// Formatters are invoked while binding, and return a wrapper function used to modify how accessors are read.
	// **IMPORTANT:
	// Note that binding formatters must access ALL of their dependent params while running,
	// otherwise accessor params become unreachable and will not provide binding hooks.
	// Therefore, it's very important that assessment loops do NOT exit early... so avoid temptation to optimize!
	var bindingFormatters = {
		
		// Tests if all of the provided accessors are truthy (and):
		all: function() {
			var params = arguments;
			return function() {
				var result = true;
				for ( var i=0, len=params.length; i < len; i++) {
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
				for ( var i=0, len=params.length; i < len; i++) {
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
				for ( var i=0, len=params.length; i < len; i++) {
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
				var str = params[0];
				for ( var i=1, len=params.length; i < len; i++) {
					str = str.replace( "$"+i, readAccessor(params[i]) );
				}
				return str;
			}
		}
	};
	

	// EpoxyBinding
	// ------------
	var EpoxyBinding = function( $element, bindings, accessors, handlers, model ) {
		this.$el = $element;
		
		var self = this;
		var tag = ($element[0].tagName).toLowerCase();
		var changable = (tag == "input" || tag == "select" || tag == "textarea");
		var parser = new Function("$f", "$a", "with($f){with($a){return{" + bindings + "}}}");
		var events = ["change"];
		
		// Parse all bindings to a hash table of accessor functions:
		bindings = parser( bindingFormatters, accessors );
		
		// Collect additional event bindings param from parsed bindings:
		// specifies dom triggers on which the DOM binding should update.
		if ( bindings.events ) {
			events = _.isArray(bindings.events) ? _.union(events, bindings.events) : events;
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
				EpoxyView._map = triggers;
				handler.set.call( self, self.$el, readAccessor(accessor) );
				EpoxyView._map = null;
				
				// Getting, requires:
				// => Form element.
				// => Binding handler has getter method.
				// => Value accessor is a function.
				if ( changable && handler.get && _.isFunction(accessor) ) {
					self.$el.on(self.events, function() {
						accessor( handler.get.call(self, self.$el, readAccessor(accessor)) );
					});
				}
				
				// Setting, requires:
				// => One or more events triggers.
				if ( triggers.length ) {
					self.listenTo( model, triggers.join(" "), function() {
						handler.set.call(self, self.$el, readAccessor(accessor));
					});
				}
				
			} else {
				// Operator was undefined:
				throw( "invalid binding => "+handlerName );
			}
		});
	};

	_.extend(EpoxyBinding.prototype, Backbone.Events, {
		events: "",
		
		// Destroys the binding:
		// all events and 
		dispose: function() {
			this.stopListening();
			this.$el.off( this.events );
			this.$el = null;
		}
	});
	
}( Backbone, _ ));