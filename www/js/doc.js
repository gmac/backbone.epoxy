// Documentation view controller:
var docsView = (function() {
	
	var DocsView = Backbone.View.extend({
		el: $(window),
		
		initialize: function() {
			
		},
		
		events: {
			"scroll": "onScroll"
		},
		
		onScroll: function() {
			
		}
	});
	
	return new DocsView();
}());



// "Run" button behaviors:
$(document).on("click", "button.run", function(evt) {
	eval( $(evt.target).parent().find("code").html() );
});