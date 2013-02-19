var TestModel = Backbone.Model.extend({
	
	defaults: {
		firstName: "Greg",
		lastName: "MacWilliam",
		nameColor: "#f00",
		userName: "Enter Name",
		age: 31
	}
	
});

var TestView = Backbone.Epoxy.View.extend({
	el: "#user-profile",
	
	model: new TestModel(),
	
	initialize: function() {
		this.bindView();
	},
	
	bindings: {
		".user-first": "text:firstName",
		".user-last": "text:lastName,css:{color:nameColor}",
		"select.user-name": "value:userName",
		"input.user-name": "value:userName",
		"p.user-name": "text:userName"
		//".active-light": "className:{enabled:true}, css:{left:dspPerc}"
	},
	
	events: {
		
	}
});

var view = new TestView();