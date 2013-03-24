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
	
	var readAccessor = Epoxy.binding.readValue;
	var addHandler = Epoxy.binding.addHandler;
	var addOperator = Epoxy.binding.addOperator;
	
	// Binding Handlers
	// ----------------
	addHandler("readonly", function( $element, value ) {
		$element.prop( "readonly", !!value );
	});
		
	addHandler("placeholder", function( $element, value ) {

	});
	
	
	// Binding Operators
	// -----------------
	addOperator("tern", function( condition, truthy, falsey ) {
		return condition ? truthy : falsey;
	});
	
}).call( this );