// Epoxy.Model
// -----------
describe("Backbone.Epoxy.Model", function() {
	
	var model;
	
	var TestModel = Backbone.Epoxy.Model.extend({

		defaults: {
			firstName: "Charlie",
			lastName: "Brown",
			donation: 100
		},
		
		computed: {
			fullName: function() {
				return this.get( "firstName" ) +" "+ this.get( "lastName" );
			},
			donationCurrency: {
				get: function() {
					return "$"+ this.get( "donation" );
				},
				set: function( value ) {
					console.log( value );
					value = value.replace("$", "");
					return {donation: parseInt( value, 10)};
				}
			}
		},
		
		initialize: function() {
			
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
	
	it("should automatically define computed properties listed in '.computed'.", function() {
		var hasFullName = model.hasComputed("fullName");
		var hasDonation = model.hasComputed("donationCurrency");
		expect( hasFullName && hasDonation ).toBe( true );
	});
	
	it("should assume computed properties defined as functions to be getters.", function() {
		var fullName = model._com[ "fullName" ];
		var protoGetter = TestModel.prototype.computed.fullName;
		expect( fullName.get === protoGetter ).toBe( true );
	});
	
	it("should access both model attributes and computed properties using '.get()'.", function() {
		var firstName = (model.get( "firstName" ) === "Charlie");
		var fullName = (model.get( "fullName" ) === "Charlie Brown");
		expect( firstName && fullName ).toBe( true );
	});
	
	it("should automatically map dependencies of computed properties.", function() {
		var fullPre = (model.get( "fullName" ) === "Charlie Brown");
		model.set( "lastName", "Black" );
		var fullPost = (model.get( "fullName" ) === "Charlie Black");
		expect( fullPre && fullPost ).toBe( true );
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