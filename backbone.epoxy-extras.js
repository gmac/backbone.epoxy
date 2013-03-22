// Backbone.Epoxy -- Extras v0.0.0
// Additional Epoxy handlers and operators for mixing into core.

// (c) 2013 Greg MacWilliam
// Freely distributed under the MIT license
// For usage and documentation:
// http://epoxyjs.org

(function() {
	
	var root = this;
	var _ = root._;
	var Backbone = root.Backbone;
	var Epoxy = Backbone.Epoxy;
	
	if (!Epoxy) throw( "Backbone.Epoxy not found." );
	
	var readAccessor = Epoxy.binding.readAccessor;
	var makeOperator = Epoxy.binding.makeOperator;

	// Binding Handlers
	// ----------------
	_.extend(Epoxy.binding.handlers, {
		
		readonly: {
			set: function( $element, value ) {
				$element.prop( "readonly", !!value );
			}
		},
		
		placeholder: {
			set: function( $element, value ) {
				
			}
		}
	});
	
	
	// Binding Operators
	// -----------------
	_.extend(Epoxy.binding.operators, {
		
	});
	
}).call( this );