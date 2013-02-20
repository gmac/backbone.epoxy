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
		var fullName = model._com[ "fullName" ];
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
	
	// Setup
	beforeEach(function() {
		
	});
	
	// Teardown
	afterEach(function() {
		// do nothing.
	});
	
	/*
	it("addNode: should add a new node with specified X and Y coordinates, and return its id.", function() {
		expect( null ).toBe( 1 );
	});
	*/
});