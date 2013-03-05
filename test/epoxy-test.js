// Epoxy.Model
// -----------
describe("Backbone.Epoxy.Model", function() {
	
	var model;
	
	
	// Primay model for test suite:
	var TestModel = Backbone.Epoxy.Model.extend({
		defaults: {
			firstName: "Charlie",
			lastName: "Brown",
			payment: 100
		},
		
		observables: {
			isSelected: false,
			testArray: []
		},
		
		computeds: {
			// Tests setting a computed property with the direct single-function getter shorthand:
			fullName: function() {
				return this.get( "firstName" ) +" "+ this.get( "lastName" );
			},
			
			// Tests two facets:
			// 1) computed dependencies definition order (defined before/after a dependency).
			// 2) computed dependencies building ontop of one another.
			paymentLabel: function() {
				return this.get( "fullName" ) +" paid "+ this.get( "paymentCurrency" );
			},
			
			// Tests defining a read/write computed property with getters and setters:
			paymentCurrency: {
				get: function() {
					return "$"+ this.get( "payment" );
				},
				set: function( value ) {
					return value ? {payment: parseInt(value.replace("$", ""), 10)} : value;
				}
			},
			
			// Tests defining a computed property with unreachable values...
			// first/last names are accessed conditionally, therefore cannot be automatically detected.
			// field dependencies may be declared manually to address this (ugly though);
			// a better solution would be to collect both "first" and "last" as local vars,
			// then release the locally established values conditionally.
			unreachable: {
				deps: ["firstName", "lastName", "isSelected"],
				get: function() {
					return this.get("isSelected") ? this.get("lastName") : this.get("firstName");
				}
			}
		},

		initialize: function() {

		}
	});
	
	
	// Secondary model, established for some relationship testing:
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
		model.clearObservables();
		model = null;
	});
	
	
	it("should use '.observables' to define basic virtual properties.", function() {
		expect( model.get("isSelected") ).toBe( false );
	});
	
	
	it("should use .get() and .set() to modify virtual properties.", function() {
		model.set( "isSelected", true );
		expect( model.get("isSelected") ).toBe( true );
	});
	
	
	it("should allow direct access to observable objects through the '.obs' namespace.", function() {
		expect( !!model.obs.isSelected ).toBe( true );
	});
	
	
	// Deprecating this feature within the published API...
	it("should allow direct access to observable property values using their own getters and setters.", function() {
		var sel = model.obs[ "isSelected" ];
		expect( sel.get() ).toBe( false );
		sel.set( true );
		expect( sel.get() ).toBe( true );
	});
	
	
	it("should allow direct management of array attributes using the '.modifyArray' method.", function() {
		expect( model.get( "testArray" ).length ).toBe( 0 );
		model.modifyArray("testArray", "push", "beachball");
		expect( model.get( "testArray" ).length ).toBe( 1 );
	});
	
	
	it("should defer all action when using '.modifyArray' on a non-array object.", function() {
		model.modifyArray("isSelected", "push", "beachball");
		expect( model.get( "isSelected" ) ).toBe( false );
	});
	
	
	it("should assume computed properties defined as functions to be getters.", function() {
		var obsGetter = model.obs.fullName._get;
		var protoGetter = TestModel.prototype.computeds.fullName;
		expect( obsGetter === protoGetter ).toBe( true );
	});
	
	
	it("should use '.computeds' to automatically construct computed properties.", function() {
		var hasFullName = model.hasObservable("fullName");
		var hasDonation = model.hasObservable("paymentCurrency");
		expect( hasFullName && hasDonation ).toBe( true );
	});
	
	
	it("should allow computed properties to be constructed out of dependency order (dependents may preceed their dependencies).", function() {
		expect( model.get("paymentLabel") ).toBe( "Charlie Brown paid $100" );
	});
	
	
	it("should allow computed properties to be defined with manual dependency declarations.", function() {
		// Test initial reachable value:
		expect( model.get("unreachable") ).toBe( "Charlie" );
		
		// Change conditional value to point at the originally unreachable value:
		model.set("isSelected", true);
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
	
	
	it("should use .addComputed() to define new properties from a params object.", function() {
		
		model.addComputed("addedProp", {
			deps: ["payment", "firstName", "lastName"],
			get: function() {
				return this.get("payment") > 50 ? this.get("firstName") : this.get("lastName");
			},
			set: function( value ) {
				return {payment: value};
			}
		});
		
		// Test initial reachable value:
		expect( model.get("addedProp") ).toBe( "Charlie" );
		
		// Change conditional value to point at the originally unreachable value:
		model.set("payment", 0);
		expect( model.get("addedProp") ).toBe( "Brown" );
		
		// Change unreachable value
		model.set("lastName", "Black");
		expect( model.get("addedProp") ).toBe( "Black" );
		
		// Set computed value
		model.set("addedProp", 123);
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
		averages.clearObservables();
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
		foreign.clearObservables();
	});

	
	it("should manage extended graphs of computed dependencies.", function() {
		expect( model.get("paymentLabel") ).toBe( "Charlie Brown paid $100" );
		model.set("payment", 150);
		expect( model.get("paymentLabel") ).toBe( "Charlie Brown paid $150" );
	});
	
	
	it("should use .set() to modify normal model attributes.", function() {
		model.set("payment", 150);
		expect( model.get("payment") ).toBe( 150 );
		expect( model.get("paymentCurrency") ).toBe( "$150" );
	});
	
	
	it("should use .set() for virtual computed properties to pass values along to the model.", function() {
		expect( model.get("payment") ).toBe( 100 );
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
	
	
	it("should use .set() to allow computed properties to cross-set one another.", function() {
		model.addComputed("crossSetter", {
			get: function() {
				return this.get("isSelected");
			},
			set: function( value ) {
				return {isSelected: true};
			}
		});
		
		expect( model.get("crossSetter") ).toBe( false );
		model.set("crossSetter", true );
		expect( model.get("isSelected") ).toBe( true );
	});
	
	
	it("should throw .set() error in response to circular setter references.", function() {
		
		model.addComputed("loopSetter1", {
			get: function() {
				return "Nothing";
			},
			set: function( value ) {
				return {loopSetter2: false};
			}
		});
		
		model.addComputed("loopSetter2", {
			get: function() {
				return "Nothing";
			},
			set: function( value ) {
				return {loopSetter1: false};
			}
		});
		
		function circularRef() {
			model.set("loopSetter1", true );
		}

		expect( circularRef ).toThrow();
	});
});

// Epoxy.View
// ----------
describe("Backbone.Epoxy.View", function() {
	
	var CollectionModel = Backbone.Model.extend({
		defaults: {
			name: ""
		}
	});
	
	var CollectionView = Backbone.View.extend({
		el: "<li><span class='name-dsp'></span><button class='name-remove'>[x]</button></li>",
		initialize: function() {
			this.$( ".name-dsp" ).text( this.model.get("name") );
		}
	});
	
	var TestCollection = Backbone.Collection.extend({
		model: CollectionModel,
		view: CollectionView
	});
	
	
	// Model:
	window.bindingModel = new (Backbone.Epoxy.Model.extend({
		defaults: {
			firstName: "Luke",
			lastName: "Skywalker",
			preference: "b",
			active: true
		},
		
		observables: {
			testCollection: new TestCollection(),
			checkList: ["b"]
		},
		
		computeds: {
			nameDisplay: function() {
				return "<strong>"+this.get("lastName")+"</strong>, "+this.get("firstName");
			},
			firstNameError: function() {
				return !this.get( "firstName" );
			},
			lastNameError: function() {
				return !this.get( "lastName" );
			},
			errorDisplay: function() {
				var first = this.get( "firstName" );
				var last = this.get( "lastName" );
				return (!first || !last) ? "block" : "none";
			}
		}
	}));
	
	// Basic bindings test view:
	var domView = new (Backbone.Epoxy.View.extend({
		el: "#dom-view",
		model: bindingModel,
		bindings: "data-bind",
		
		bindingHandlers: {
			printArray: function( $element, value ) {
				$element.text( value.slice().sort().join(", ") );
			}
		}
	}));
	
	// Modifiers / Collections testing view:
	var modView = new (Backbone.Epoxy.View.extend({
		el: "#mod-view",
		model: bindingModel,
		bindings: "data-bind",

		events: {
			"click .name-add": "onAddName",
			"click .name-remove": "onRemoveName"
		},
		
		onAddName: function() {
			var input = this.$( ".name-input" );
			
			if ( input.val() ) {
				this.model.get( "testCollection" ).add({
					name: input.val()
				});
				input.val("");
			}
		},
		
		onRemoveName: function( evt ) {
			var i = $( evt.target ).closest( "li" ).index();
			var col = this.model.get( "testCollection" );
			col.remove( col.at(i) );
		}
	}));
	
	var tmplView = new (Backbone.Epoxy.View.extend({
		el: $("#tmpl-view-tmpl").html(),
		model: bindingModel,
		
		bindings: {
			".user-first": "text:firstName",
			".user-last": "text:lastName"
		},

		initialize: function() {
			$("#tmpl-view-tmpl").after( this.$el );
		}
	}));
	
	// Setup
	beforeEach(function() {
		
	});
	
	// Teardown
	afterEach(function() {
		bindingModel.observables.checkList = [ "b" ];
		bindingModel.set( bindingModel.defaults );
		bindingModel.set( bindingModel.observables );
	});
	
	
	it("should bind view elements to model via binding selector map.", function() {
		var $el = $("#tmpl-view .user-first");
		expect( $el.text() ).toBe( "Luke" );
	});
	
	
	it("should bind view elements to model via element attribute query.", function() {
		var $el = $("#dom-view .test-text-first");
		expect( $el.text() ).toBe( "Luke" );
	});
	
	
	it("should include top-level view container in bindings searches.", function() {
		
		var view1 = new (Backbone.Epoxy.View.extend({
			el: "<span data-bind='text:firstName'></span>",
			model: bindingModel,
			bindings: "data-bind"
		}));
		
		var view2 = new (Backbone.Epoxy.View.extend({
			el: "<span class='first-name'></span>",
			model: bindingModel,
			bindings: {
				".first-name": "text:firstName"
			}
		}));
		
		expect( view1.$el.text() ).toBe( "Luke" );
		expect( view2.$el.text() ).toBe( "Luke" );
	});
	
	it("should throw error in response to undefined property bindings.", function() {
		
		var ErrorView = Backbone.Epoxy.View.extend({
			el: "<div><span data-bind='text:undefinedProp'></span></div>",
			model: bindingModel,
			bindings: "data-bind"
		});
		
		function testForError(){
			var error = new ErrorView();
		}
		
		expect( testForError ).toThrow();
	});
	
	
	it("binding 'attr:' should establish a one-way binding with an element's attribute definitions.", function() {
		var $el = $(".test-attr-multi");
		expect( $el.attr("href") ).toBe( "b" );
		expect( $el.attr("title") ).toBe( "b" );
		bindingModel.set("preference", "c");
		expect( $el.attr("href") ).toBe( "c" );
		expect( $el.attr("title") ).toBe( "c" );
	});
	
	
	it("binding 'attr:' should allow string property definitions.", function() {
		var $el = $(".test-attr");
		expect( $el.attr("data-active") ).toBe( "true" );
		bindingModel.set("active", false);
		expect( $el.attr("data-active") ).toBe( "false" );
	});
	
	
	it("binding 'checked:' should establish a two-way binding with a radio group.", function() {
		var $a = $(".preference[value='a']");
		var $b = $(".preference[value='b']");
		expect( $a.prop("checked") ).toBe( false );
		expect( $b.prop("checked") ).toBe( true );
		$a.prop("checked", true).trigger("change");
		expect( bindingModel.get("preference") ).toBe( "a" );
	});
	
	
	it("binding 'checked:' should establish a two-way binding between a checkbox and boolean value.", function() {
		var $el = $(".test-checked-boolean");
		expect( $el.prop("checked") ).toBe( true );
		$el.prop("checked", false).trigger("change");
		expect( bindingModel.get("active") ).toBe( false );
	});
	
	
	it("binding 'checked:' should set a checkbox series based on a model array.", function() {
		var $els = $(".check-list");
		
		// Default: populate based on intial setting:
		expect( !!$els.filter("[value='b']" ).prop("checked") ).toBe( true );
		expect( !!$els.filter("[value='c']" ).prop("checked") ).toBe( false );
		
		// Add new selection to the checkbox group:
		bindingModel.set("checkList", ["b", "c"]);
		expect( !!$els.filter("[value='b']" ).prop("checked") ).toBe( true );
		expect( !!$els.filter("[value='c']" ).prop("checked") ).toBe( true );
	});
	
	
	it("binding 'checked:' should respond to model changes performed by '.modifyArray'.", function() {
		var $els = $(".check-list");
		
		// Add new selection to the checkbox group:
		expect( !!$els.filter("[value='b']" ).prop("checked") ).toBe( true );
		expect( !!$els.filter("[value='c']" ).prop("checked") ).toBe( false );
		bindingModel.modifyArray("checkList", "push", "c");
		expect( !!$els.filter("[value='b']" ).prop("checked") ).toBe( true );
		expect( !!$els.filter("[value='c']" ).prop("checked") ).toBe( true );
	});
	
	
	it("binding 'checked:' should get a checkbox series formatted as a model array.", function() {
		var $els = $(".check-list");
		bindingModel.set("checkList", ["b"]);
		
		// Default: populate based on intial setting:
		expect( !!$els.filter("[value='b']" ).prop("checked") ).toBe( true );
		$els.filter("[value='a']").prop("checked", true).trigger("change");
		expect( bindingModel.get("checkList").join(",") ).toBe( "b,a" );
	});
	
	
	it("binding 'classes:' should establish a one-way binding with an element's class definitions.", function() {
		var $el = $(".test-classes").eq(0);
		expect( $el.hasClass("error") ).toBe( false );
		expect( $el.hasClass("active") ).toBe( true );
		bindingModel.set({
			firstName: "",
			active: false
		});
		expect( $el.hasClass("error") ).toBe( true );
		expect( $el.hasClass("active") ).toBe( false );
	});
	
	
	it("binding 'collection:' should establish a one-way binding that displays a Backbone.Collection.", function() {
		//var $el = $(".test-css");
		var collection = bindingModel.get( "testCollection" );
		collection.reset([
			{name: "Luke Skywalker"},
			{name: "Hans Solo"},
			{name: "Chewy"}
		]);
	});
	
	
	it("binding 'css:' should establish a one-way binding with an element's css styles.", function() {
		var $el = $(".test-css");
		expect( $el.css("display") ).toBe( "none" );
		bindingModel.set( "lastName", "" );
		expect( $el.css("display") ).toBe( "block" );
	});
	
	
	it("binding 'disabled:' should establish a one-way binding with an element's disabled state.", function() {
		var $el = $(".test-disabled");
		expect( $el.prop("disabled") ).toBeTruthy();
		bindingModel.set( "active", false );
		expect( $el.prop("disabled") ).toBeFalsy();
	});
	
	
	it("binding 'enabled:' should establish a one-way binding with an element's inverted disabled state.", function() {
		var $el = $(".test-enabled");
		expect( $el.prop("disabled") ).toBeFalsy();
		bindingModel.set( "active", false );
		expect( $el.prop("disabled") ).toBeTruthy();
	});
	
	
	it("binding 'events:' should configure additional DOM event triggers.", function() {
		var $el = $(".test-input-first");
		expect( $el.val() ).toBe( "Luke" );
		$el.val( "Anakin" ).trigger("keyup");
		expect( bindingModel.get("firstName") ).toBe( "Anakin" );
	});
	
	
	it("binding 'html:' should establish a one-way binding with an element's html contents.", function() {
		var $el = $(".test-html");
		expect( $el.html() ).toBe( "<strong>Skywalker</strong>, Luke" );
		bindingModel.set("firstName", "Anakin");
		expect( $el.html() ).toBe( "<strong>Skywalker</strong>, Anakin" );
	});
	
	
	it("binding 'text:' should establish a one-way binding with an element's text contents.", function() {
		var $el = $(".test-text-first");
		expect( $el.text() ).toBe( "Luke" );
		bindingModel.set("firstName", "Anakin");
		expect( $el.text() ).toBe( "Anakin" );
	});
	
	
	it("binding 'toggle:' should establish a one-way binding with an element's visibility.", function() {
		var $el = $(".test-toggle");
		expect( $el.is(":visible") ).toBe( true );
		bindingModel.set("active", false);
		expect( $el.is(":visible") ).toBe( false );
	});
	
	
	it("binding 'value:' should establish a two-way binding with an input field.", function() {
		var $el = $(".test-input-first");
		expect( $el.val() ).toBe( "Luke" );
		$el.val( "Anakin" ).trigger("change");
		expect( bindingModel.get("firstName") ).toBe( "Anakin" );
	});
	
	
	it("should allow custom bindings to set data into the view.", function() {
		var $els = $(".test-custom-binding");
		expect( $els.text() ).toBe( "b" );
		bindingModel.set("checkList", ["c","a"]);
		expect( $els.text() ).toBe( "a, c" );
	});
	
	
	it("should allow custom bindings to get data from the view.", function() {
		
	});
	
	
	it("modifying with not() should negate a binding value.", function() {
		var $el = $(".test-mod-not");
		expect( $el.is(":visible") ).toBe( false );
		bindingModel.set("active", false);
		expect( $el.is(":visible") ).toBe( true );
	});
	
	
	it("modifying with all() should bind true when all bound values are truthy.", function() {
		var $el = $(".test-mod-all");
		expect( $el.hasClass("hilite") ).toBe( true );
		bindingModel.set("firstName", "");
		expect( $el.hasClass("hilite") ).toBe( false );
	});
	
	
	it("modifying with none() should bind true when all bound values are falsy.", function() {
		var $el = $(".test-mod-none");
		expect( $el.hasClass("hilite") ).toBe( false );
		bindingModel.set({
			firstName: "",
			lastName: ""
		});
		expect( $el.hasClass("hilite") ).toBe( true );
	});
	
	
	it("modifying with any() should bind true when any bound value is truthy.", function() {
		var $el = $(".test-mod-any");
		expect( $el.hasClass("hilite") ).toBe( true );
		bindingModel.set("firstName", "");
		expect( $el.hasClass("hilite") ).toBe( true );
		bindingModel.set("lastName", "");
		expect( $el.hasClass("hilite") ).toBe( false );
	});
	
	
	it("modifying with format() should bind true when any bound value is truthy.", function() {
		var $el = $(".test-mod-format");
		expect( $el.text() ).toBe( "Name: Luke Skywalker" );
		bindingModel.set("firstName", "Charlie");
		expect( $el.text() ).toBe( "Name: Charlie Skywalker" );
		bindingModel.set("lastName", "Brown");
		expect( $el.text() ).toBe( "Name: Charlie Brown" );
	});
});
