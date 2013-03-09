// Backbone.Epoxy

// (c) 2013 Greg MacWilliam
// Epoxy may be freely distributed under the MIT license.
// For all details and documentation:
// http://epoxyjs.org

(function( Backbone, _ ) {
	
	Backbone.Epoxy = Backbone.Epoxy || {};
	
	
	// Bindings Map:
	// stores an attributes binding map while configuring view bindings.
	var bindingsMap;
	
	
	// Adds a data provider to a view:
	// Data providers are Backbone.Model and Backbone.Collection instances.
	// @param provider: a provider instance, or a function that returns a provider.
	// @param context: the working binding context. All bindings in a view share a context.
	function addDataSource( provider, context, name ) {
		
		// Abort on missing providers, or construct non-instance
		if (!provider) return;
		else if (_.isFunction(provider)) provider = provider();
		
		// Add Backbone.Model provider instance:
		if ( provider instanceof Backbone.Model ) {
			
			// Establish provider prefix:
			var prefix = name ? name+"_" : "";
			
			// Compile table of all provider attributes (native and observable):
			var attrs = _.extend({}, provider.attributes, provider.obs||{});
			
			// Create special read-only model accessor for provider instance:
			context[ "$"+(name||"model") ] = function() {
				bindingsMap && bindingsMap.push([provider, "change"]);
				return provider;
			};
			
			// Compile all provider attributes as accessors within the context:
			_.each(attrs, function(value, attribute) {
				// Create named accessor function:
				// -> Direct view.model attributes use normal names.
				// -> Attributes from additional providers are named as "provider_attribute".
				context[ prefix+attribute ] = function( value ) {
					// Record property to binding map, when enabled:
					bindingsMap && bindingsMap.push([provider, "change:"+attribute]);

					// Get / Set value:
					if ( !_.isUndefined(value) ) {
						if ( _.isObject(value) && !_.isArray(value) ) {
							// Set Object (non-null, non-array) hashtable value:
							return provider.set( value );
						}
						// Set single property/value pair:
						return provider.set( attribute, value );
					}
					return provider.get( attribute );
				};
			});
			
		}
		// Add Backbone.Collection provider instance:
		else if ( provider instanceof Backbone.Collection ) {
			
			// Create special read-only collection accessor:
			context[ "$"+(name||"collection") ] = function() {
				bindingsMap && bindingsMap.push([provider, "reset add remove sort"]);
				return provider;
			};
		}
		
		return provider;
	}
	
	
	// Epoxy.View
	// ----------
	var EpoxyView = Backbone.Epoxy.View = Backbone.View.extend({
		
		// Backbone.View.constructor override:
		// sets up binding controls, then runs super.
		constructor: function( options ) {
			// Create bindings list:
			this._bind = [];
			Backbone.View.prototype.constructor.apply( this, arguments );
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
			    handlers[ name ] = _.isFunction(handler) ? {set: handler} : handler;
			});
			
			// Add directly-referenced model and collection providers:
			self.model = addDataSource( self.model, context );
			self.collection = addDataSource( self.collection, context );
			
			// Add additional sources...
			_.each(sources, function( provider, providerName ) {
				sources[ providerName ] = addDataSource( provider, context, providerName );
			});
			
			// Binds an element onto the model:
			function bind( $element, bindings, selector ) {
				// Try to compile bindings, throw errors if encountered:
				try {
					self._bind.push(new EpoxyBinding($element, bindings, context, handlers, this));
				} catch( error ) {
					throw( 'Error parsing bindings for "'+ selector +'" >> '+error );
				}
			}
			
			// Create bindings:
			if ( _.isObject(this.bindings) ) {
				
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
	
	
	// Binding Handlers
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
					
				} else if ( _.isArray(currentValue) ) {
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
					
				} else if ( _.isArray(value) ) {
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
				var Collection = Backbone.Collection;
				
				// Requires a valid collection argument with an associated view:
				if ( collection instanceof Collection && _.isFunction(collection.view) ) {
					
					var models = collection.models;
					var views = this.v;
					var view;
					
					// Default target to the bound collection object:
					// during init (or failure), the binding will reset.
					target = target || collection;

					if ( target instanceof Backbone.Model ) {
						
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
						
					} else if ( target instanceof Collection ) {
						
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
				$element.val( value );
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
	
	// EpoxyBinding
	// ------------
	var EpoxyBinding = function( $element, bindings, context, handlers, view ) {
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
				bindingsMap = triggers;
				handler.set.call(self, self.$el, readAccessor(accessor));
				bindingsMap = null;
				
				// READ/GET, requires:
				// => Form element.
				// => Binding handler has getter method.
				// => Value accessor is a function.
				if ( changable && handler.get && _.isFunction(accessor) ) {
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
	
}( Backbone, _ ));