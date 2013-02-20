// Epoxy.Model
// -----------
describe("Backbone.Epoxy.Model", function() {
	
	var model;
	
	var TestModel = Backbone.Epoxy.Model.extend({
		defaults: {
			firstName: "Charlie",
			lastName: "Brown",
			payment: 100
		},

		computed: {
			fullName: function() {
				return this.get( "firstName" ) +" "+ this.get( "lastName" );
			},
			paymentCurrency: {
				get: function() {
					return "$"+ this.get( "payment" );
				},
				set: function( value ) {
					return value ? {payment: parseInt(value.replace("$", ""), 10)} : value;
				}
			},
			unreachable: {
				deps: ["firstName", "lastName", "payment"],
				get: function() {
					return this.get("payment") > 50 ? this.get("firstName") : this.get("lastName");
				}
			},
			paymentLabel: function() {
				return this.get( "fullName" ) +" paid "+ this.get( "paymentCurrency" );
			}
		},

		initialize: function() {

		}
	});

	var ForeignModel = Backbone.Epoxy.Model.extend({
		defaults: {
			avgPayment: 200
		}
	});
	
	// Setup
	beforeEach(function() {
		model = new TestModel();
	});
	
	// Teardown
	afterEach(function() {
		model.clearComputed();
		model = null;
	});
	
	
	it("should assume computed properties defined as functions to be getters.", function() {
		var fullName = model._cmp[ "fullName" ];
		var protoGetter = TestModel.prototype.computed.fullName;
		expect( fullName.get === protoGetter ).toBe( true );
	});
	
	
	it("should use .computed to automatically define computed properties.", function() {
		var hasFullName = model.hasComputed("fullName");
		var hasDonation = model.hasComputed("paymentCurrency");
		expect( hasFullName && hasDonation ).toBe( true );
	});
	
	
	it("should use .computed to automatically define computed properties with dependencies.", function() {
		// Test initial reachable value:
		expect( model.get("unreachable") ).toBe( "Charlie" );
		
		// Change conditional value to point at the originally unreachable value:
		model.set("payment", 0);
		expect( model.get("unreachable") ).toBe( "Brown" );
		
		// Change unreachable value
		model.set("lastName", "Black");
		expect( model.get("unreachable") ).toBe( "Black" );
	});
	
	
	it("should use .addComputed() to define computed properties.", function() {
		model.addComputed("nameReverse", function() {
			return this.get("lastName") +", "+ this.get("firstName");
		});
		expect( model.get("nameReverse") ).toBe( "Brown, Charlie" );
	});
	
	
	it("should use .addComputed() to define properties with passed dependencies.", function() {
		
		model.addComputed("unreachable", function() {
			return this.get("payment") > 50 ? this.get("firstName") : this.get("lastName");
		}, "payment", "firstName", "lastName");
		
		// Test initial reachable value:
		expect( model.get("unreachable") ).toBe( "Charlie" );
		
		// Change conditional value to point at the originally unreachable value:
		model.set("payment", 0);
		expect( model.get("unreachable") ).toBe( "Brown" );
		
		// Change unreachable value
		model.set("lastName", "Black");
		expect( model.get("unreachable") ).toBe( "Black" );
	});
	
	
	it("should use .addComputed() to define properties from a params object.", function() {
		
		model.addComputed("unreachable", {
			deps: ["payment", "firstName", "lastName"],
			get: function() {
				return this.get("payment") > 50 ? this.get("firstName") : this.get("lastName");
			},
			set: function( value ) {
				return {payment: value};
			}
		});
		
		// Test initial reachable value:
		expect( model.get("unreachable") ).toBe( "Charlie" );
		
		// Change conditional value to point at the originally unreachable value:
		model.set("payment", 0);
		expect( model.get("unreachable") ).toBe( "Brown" );
		
		// Change unreachable value
		model.set("lastName", "Black");
		expect( model.get("unreachable") ).toBe( "Black" );
		
		// Set computed value
		model.set("unreachable", 123);
		expect( model.get("payment") ).toBe( 123 );
	});
	

	it("should use .get() to access both model attributes and computed properties.", function() {
		var firstName = (model.get("firstName") === "Charlie");
		var fullName = (model.get("fullName") === "Charlie Brown");
		expect( firstName && fullName ).toBe( true );
	});
	
	
	it("should automatically map and bind computed property dependencies.", function() {
		var fullPre = (model.get( "fullName" ) === "Charlie Brown");
		model.set( "lastName", "Black" );
		var fullPost = (model.get( "fullName" ) === "Charlie Black");
		expect( fullPre && fullPost ).toBe( true );
	});
	
	
	it("should automatically map and bind computed property dependencies on foreign Epoxy models.", function() {
		var averages = new ForeignModel();
		
		model.addComputed("percentAvgPayment", function() {
			return this.get("payment") / averages.get("avgPayment");
		});
		
		expect( model.get("percentAvgPayment") ).toBe( 0.5 );
		averages.set("avgPayment", 400);
		expect( model.get("percentAvgPayment") ).toBe( 0.25 );
		averages.clearComputed();
	});
	
	
	it("should support manual definition of foreign dependencies.", function() {
		var foreign = new ForeignModel();
		
		model.addComputed("unreachable", function() {
			return this.get("firstName") ? this.get("payment") : foreign.get("avgPayment");
		}, "firstName", "payment", ["avgPayment", foreign]);
		
		// Test initial reachable value:
		expect( model.get("unreachable") ).toBe( 100 );
		
		// Change conditional value to point at the originally unreachable value:
		model.set("firstName", "");
		expect( model.get("unreachable") ).toBe( 200 );
		
		// Change unreachable value
		foreign.set("avgPayment", 400);
		expect( model.get("unreachable") ).toBe( 400 );
		foreign.clearComputed();
	});

	
	it("should manage extended graphs of computed dependencies.", function() {
		expect( model.get("paymentLabel") ).toBe( "Charlie Brown paid $100" );
		model.set("payment", 150);
		expect( model.get("paymentLabel") ).toBe( "Charlie Brown paid $150" );
	});
	
	
	it("should use .set() to modify both model attributes and computed properties.", function() {
		model.set("payment", 150);
		expect( model.get("payment") ).toBe( 150 );
		expect( model.get("paymentCurrency") ).toBe( "$150" );
		
		model.set("paymentCurrency", "$200");
		expect( model.get("payment") ).toBe( 200 );
		expect( model.get("paymentCurrency") ).toBe( "$200" );
	});
	
	
	it("should throw .set() error when modifying read-only computed properties.", function() {
		function testForError() {
			model.set("fullName", "Charlie Black");
		}
		expect( testForError ).toThrow();
	});
});

// Epoxy.View
// ----------
describe("Backbone.Epoxy.View", function() {
	
	// Model:
	window.bindingModel = new (Backbone.Epoxy.Model.extend({
		defaults: {
			firstName: "Luke",
			lastName: "Skywalker",
			active: true,
			preference: "b"
		},
		
		computed: {
			nameDisplay: function() {
				return "<strong>"+this.get("lastName")+"</strong>, "+this.get("firstName");
			},
			nameError: function () {
				return !this.get( "firstName" );
			}
		}
	}));
	
	// Views:
	var domView = new (Backbone.Epoxy.View.extend({
		el: "#dom-view",
		model: bindingModel,
		bindings: "data-bind",

		initialize: function() {
			this.bindView();
		}
	}));
	
	var tmplView = new (Backbone.Epoxy.View.extend({
		template: $("#tmpl-view-tmpl").html(),
		model: bindingModel,
		
		bindings: {
			".user-first": "text:firstName",
			".user-last": "text:lastName"
		},

		initialize: function() {
			domView.$el.after( this.$el );
			this.bindView();
		}
	}));
	
	// Setup
	beforeEach(function() {
		
	});
	
	// Teardown
	afterEach(function() {
		bindingModel.set( bindingModel.defaults );
	});
	
	
	it("should automatically create view elements from a provided text template.", function() {
		expect( $("#tmpl-view").length ).toBe( 1 );
	});
	
	
	it("should bind view elements to model via binding selector map.", function() {
		var $el = $("#tmpl-view .user-first");
		expect( $el.text() ).toBe( "Luke" );
	});
	
	
	it("should bind view elements to model via element attribute query.", function() {
		var $el = $("#dom-view .user-first");
		expect( $el.text() ).toBe( "Luke" );
	});
	
	
	it("binding 'attr:' should establish a one-way binding with an element's attribute definitions.", function() {
		//expect().toBe( true );
	});
	
	
	it("binding 'checked:' should establish a two-way binding with a checkbox.", function() {
		var $el = $("#dom-view .active");
		expect( $el.prop("checked") ).toBe( true );
		
		$el.prop("checked", false).trigger("change");
		expect( bindingModel.get("active") ).toBe( false );
	});
	
	
	it("binding 'checked:' should establish a two-way binding with a radio group.", function() {
		var $a = $(".preference[value='a']");
		var $b = $(".preference[value='b']");
		expect( $a.prop("checked") ).toBe( false );
		expect( $b.prop("checked") ).toBe( true );
		
		$a.prop("checked", true).trigger("change");
		expect( bindingModel.get("preference") ).toBe( "a" );
	});
	
	
	it("binding 'className:' should establish a one-way binding with an element's class definitions.", function() {
		var $el = $("#dom-view .user-name-label");
		expect( $el.hasClass("error") ).toBe( false );
		
		bindingModel.set("firstName", "");
		expect( $el.hasClass("error") ).toBe( true );
	});
	
	
	it("binding 'css:' should establish a one-way binding with an element's css styles.", function() {
		//expect().toBe( true );
	});
	
	
	it("binding 'disabled:' should establish a one-way binding with an element's disabled state.", function() {
		//expect().toBe( true );
	});
	
	
	it("binding 'enabled:' should establish a one-way binding with an element's inverted disabled state.", function() {
		//expect().toBe( true );
	});
	
	
	it("binding 'events:' should configure additional DOM event triggers.", function() {
		var $el = $("#dom-view .user-name");
		expect( $el.val() ).toBe( "Luke" );
		$el.val( "Anakin" ).trigger("keyup");
		expect( bindingModel.get("firstName") ).toBe( "Anakin" );
	});
	
	
	it("binding 'html:' should establish a one-way binding with an element's html contents.", function() {
		var $el = $("#dom-view .user-html");
		expect( $el.html() ).toBe( "<strong>Skywalker</strong>, Luke" );
		
		bindingModel.set("firstName", "Anakin");
		expect( $el.html() ).toBe( "<strong>Skywalker</strong>, Anakin" );
	});
	
	
	it("binding 'text:' should establish a one-way binding with an element's text contents.", function() {
		var $el = $("#dom-view .user-first");
		expect( $el.text() ).toBe( "Luke" );
		
		bindingModel.set("firstName", "Anakin");
		expect( $el.text() ).toBe( "Anakin" );
	});
	
	
	it("binding 'toggle:' should establish a one-way binding with an element's visibility.", function() {
		//expect().toBe( true );
	});
	
	
	it("binding 'value:' should establish a two-way binding with an input field.", function() {
		var $el = $("#dom-view .user-name");
		expect( $el.val() ).toBe( "Luke" );
		$el.val( "Anakin" ).trigger("change");
		expect( bindingModel.get("firstName") ).toBe( "Anakin" );
	});
});