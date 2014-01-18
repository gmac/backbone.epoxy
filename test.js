// Epoxy.Model
// -----------
describe("Backbone.Epoxy.Model", function() {

	var model;


	// Primay model for test suite:
	var TestModel = Backbone.Epoxy.Model.extend({
		defaults: {
			firstName: "Charlie",
			lastName: "Brown",
			payment: 100,
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
		model.clearComputeds();
		model = null;
	});


	it("should construct model with class options defined.", function() {
		var obj = {};

		var model = new Backbone.Epoxy.Model({}, {
			computeds: obj
		});

		expect( model.computeds ).to.equal( obj );
	});

	it("should construct model with class options defined.", function() {
		var obj = {};

		var model = new Backbone.Epoxy.Model({}, {
			computeds: obj
		});

		expect( model.computeds ).to.equal( obj );
	});

	it("should allow Epoxy model configuration to mixin with another Backbone Model.", function() {
		var MixinModel = Backbone.Model.extend({
			defaults: {
				avgPayment: 500
			},

			initialize: function() {
				this.initComputeds();
			},

			computeds: {
				avgPaymentDsp: function() {
					return "$"+this.get( "avgPayment" );
				}
			}
		});

		Backbone.Epoxy.Model.mixin( MixinModel.prototype );
		var model = new MixinModel();
		
		expect( model.get("avgPaymentDsp") ).to.equal( "$500" );
	});


	it("should use .get() and .set() to modify native properties.", function() {
		model.set( "isSelected", true );
		expect( model.get("isSelected") ).to.equal( true );
	});


	it("should get native model attributes using '.toJSON()'.", function() {
		var json = model.toJSON();
		expect( _.size(json) ).to.equal( 5 );
	});


	it("should get native and computed model attributes using '.toJSON({computed:true})'.", function() {
		var json = model.toJSON({computed:true});
		expect( _.size(json) ).to.equal( 9 );
		expect( json.fullName ).to.equal( "Charlie Brown" );
	});


	it("should allow direct management of array attributes using the '.modifyArray' method.", function() {
		expect(model.get( "testArray" )).to.have.length( 0 );
		model.modifyArray("testArray", "push", "beachball");
		expect(model.get( "testArray" )).to.have.length( 1 );
	});


	it("should defer all action when using '.modifyArray' on a non-array object.", function() {
		model.modifyArray("isSelected", "push", "beachball");
		expect( model.get( "isSelected" ) ).to.equal( false );
	});


	it("should assume computed properties defined as functions to be getters.", function() {
		var obsGetter = model._c.fullName._get;
		var protoGetter = TestModel.prototype.computeds.fullName;
		expect( obsGetter === protoGetter ).to.equal( true );
	});


	it("should use '.computeds' to automatically construct computed properties.", function() {
		var hasFullName = model.hasComputed("fullName");
		var hasDonation = model.hasComputed("paymentCurrency");
		expect( hasFullName && hasDonation ).to.equal( true );
	});


	it("should allow computed properties to be constructed out of dependency order (dependents may preceed their dependencies).", function() {
		expect( model.get("paymentLabel") ).to.equal( "Charlie Brown paid $100" );
	});


	it("should allow computed properties to be defined with manual dependency declarations.", function() {
		// Test initial reachable value:
		expect( model.get("unreachable") ).to.equal( "Charlie" );

		// Change conditional value to point at the originally unreachable value:
		model.set("isSelected", true);
		expect( model.get("unreachable") ).to.equal( "Brown" );

		// Change unreachable value
		model.set("lastName", "Black");
		expect( model.get("unreachable") ).to.equal( "Black" );
	});


	it("should inject manual dependency declarations as getter arguments.", function() {
		model.addComputed("getterInjection", function(first, last) {
			return first +" "+ last;
		}, "firstName", "lastName");

		expect( model.get("getterInjection") ).to.equal( "Charlie Brown" );
	});


	it("should use .addComputed() to define computed properties.", function() {
		model.addComputed("nameReverse", function() {
			return this.get("lastName") +", "+ this.get("firstName");
		});
		expect( model.get("nameReverse") ).to.equal( "Brown, Charlie" );
	});


	it("should use .addComputed() to define properties with passed dependencies.", function() {

		model.addComputed("unreachable", function() {
			return this.get("payment") > 50 ? this.get("firstName") : this.get("lastName");
		}, "payment", "firstName", "lastName");

		// Test initial reachable value:
		expect( model.get("unreachable") ).to.equal( "Charlie" );

		// Change conditional value to point at the originally unreachable value:
		model.set("payment", 0);
		expect( model.get("unreachable") ).to.equal( "Brown" );

		// Change unreachable value
		model.set("lastName", "Black");
		expect( model.get("unreachable") ).to.equal( "Black" );
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
		expect( model.get("addedProp") ).to.equal( "Charlie" );

		// Change conditional value to point at the originally unreachable value:
		model.set("payment", 0);
		expect( model.get("addedProp") ).to.equal( "Brown" );

		// Change unreachable value
		model.set("lastName", "Black");
		expect( model.get("addedProp") ).to.equal( "Black" );

		// Set computed value
		model.set("addedProp", 123);
		expect( model.get("payment") ).to.equal( 123 );
	});


	it("should use .get() to access both model attributes and computed properties.", function() {
		var firstName = (model.get("firstName") === "Charlie");
		var fullName = (model.get("fullName") === "Charlie Brown");
		expect( firstName && fullName ).to.equal( true );
	});


	it("should automatically map and bind computed property dependencies.", function() {
		var fullPre = (model.get( "fullName" ) === "Charlie Brown");
		model.set( "lastName", "Black" );
		var fullPost = (model.get( "fullName" ) === "Charlie Black");
		expect( fullPre && fullPost ).to.equal( true );
	});


	it("should automatically map and bind computed property dependencies on foreign Epoxy models.", function() {
		var averages = new ForeignModel();

		model.addComputed("percentAvgPayment", function() {
			return this.get("payment") / averages.get("avgPayment");
		});

		expect( model.get("percentAvgPayment") ).to.equal( 0.5 );
		averages.set("avgPayment", 400);
		expect( model.get("percentAvgPayment") ).to.equal( 0.25 );
		averages.clearComputeds();
	});


	it("should manage extended graphs of computed dependencies.", function() {
		expect( model.get("paymentLabel") ).to.equal( "Charlie Brown paid $100" );
		model.set("payment", 150);
		expect( model.get("paymentLabel") ).to.equal( "Charlie Brown paid $150" );
	});


	it("should use .set() to modify normal model attributes.", function() {
		model.set("payment", 150);
		expect( model.get("payment") ).to.equal( 150 );
		expect( model.get("paymentCurrency") ).to.equal( "$150" );
	});


	it("should use .set() for virtual computed properties to pass values along to the model.", function() {
		expect( model.get("payment") ).to.equal( 100 );
		model.set("paymentCurrency", "$200");
		expect( model.get("payment") ).to.equal( 200 );
		expect( model.get("paymentCurrency") ).to.equal( "$200" );
	});


	it("should throw .set() error when modifying read-only computed properties.", function() {
		function testForError() {
			model.set("fullName", "Charlie Black");
		}
		expect( testForError ).to.throw();
	});


	it("should use .set() to allow computed properties to cross-set one another.", function() {
		model.addComputed("crossSetter", {
			get: function() {
				return this.get("isSelected");
			},
			set: function( value ) {
				return {isSelected: value};
			}
		});

		expect( model.get("crossSetter") ).to.equal( false );
		model.set("crossSetter", true );
		expect( model.get("isSelected") ).to.equal( true );
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

		expect( circularRef ).to.throw();
	});
});


// Epoxy.View
// ----------
describe("Backbone.Epoxy.View", function() {

	// Collection test components:

	var CollectionView = Backbone.Epoxy.View.extend({
		el: "<li><span class='name-dsp' data-bind='text:name'></span> <button class='name-remove'>x</button></li>"
	});

	var TestCollection = Backbone.Collection.extend({
		model: Backbone.Model,
		view: CollectionView
	});


	// Test model:

	window.dataModel = new (Backbone.Epoxy.Model.extend({
		defaults: {
			firstName: "Luke",
			lastName: "Skywalker",
			preference: "b",
			active: true,
			valOptions: "1",
			valDefault: "1",
			valEmpty: "1",
			valBoth: "1",
			valMulti: "1",
			valCollect: ""
		},

		computeds: {
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

	window.viewModel = new (Backbone.Epoxy.Model.extend({
		defaults: {
			checkList: ["b"],
			optionsList: [
				{value: "0", label: "Luke Skywalker"},
				{value: "1", label: "Han Solo"},
				{value: "2", label: "Obi-Wan Kenobi"}
			],
			optDefault: "default",
			optEmpty: "empty"
		}
	}));

	// Basic bindings test view:
	var domView = new (Backbone.Epoxy.View.extend({
		el: "#dom-view",
		model: dataModel,
		viewModel: viewModel,
		bindings: "data-bind",

		bindingHandlers: {
			printArray: function( $element, value ) {
				$element.text( value.slice().sort().join(", ") );
			},
			sayYesNo: {
				get: function( $element ) {
					return {active: $element.val().indexOf("Y") === 0 };
				},
				set: function( $element, value ) {
					$element.val( value ? "Y" : "N" );
				}
			}
		},

		computeds: {
			checkedCount: function() {
				return "Checked items: "+ this.getBinding("checkList").length;
			},
			nameDisplay: {
				deps: ["lastName", "firstName"],
				get: function( lastName, firstName ) {
					return "<strong>"+ lastName +"</strong>, "+ firstName;
				},
				set: function( value ) {
					this.nameDisplaySetterValue = value;
				}
			}
		}
	}));

	// Modifiers / Collections testing view:

	var modView = new (Backbone.Epoxy.View.extend({
		el: "#mod-view",
		model: dataModel,
		viewModel: viewModel,
		collection: new TestCollection(),
		bindings: "data-bind",

		events: {
			"click .name-add": "onAddName",
			"click .name-remove": "onRemoveName"
		},

		onAddName: function() {
			var input = this.$( ".name-input" );

			if ( input.val() ) {
				this.collection.add({
					name: input.val()
				});
				input.val("");
			}
		},

		onRemoveName: function( evt ) {
			var i = $( evt.target ).closest( "li" ).index();
			this.collection.remove( this.collection.at(i) );
		}
	}));


	// Bindings map declaration:

	var tmplView = new (Backbone.Epoxy.View.extend({
		el: $("#tmpl-view-tmpl").html(),
		model: dataModel,
		viewModel: viewModel,

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
		var defaults = _.clone( viewModel.defaults );
		defaults.checkList = _.clone( defaults.checkList );
		defaults.optionsList = _.clone( defaults.optionsList );

		dataModel.set( dataModel.defaults );
		viewModel.set( defaults );
		modView.collection.reset();
	});


	// Simple visibility check to replace ".is(':visible')", for basic Zepto caompatibility:
	function isVisible($el) {
		var dsp = $el.css("display");
		return dsp !== 'none';
	}

	it("should construct view with class options defined.", function() {
		var model = new Backbone.Model();
		var obj = {};

		var view = new Backbone.Epoxy.View({
			model: model,
			viewModel: model,
			computeds: obj,
			bindings: "my-binding",
			bindingFilters: obj,
			bindingHandlers: obj,
			bindingSources: obj
		});

		expect( view.model ).to.equal( model );
		expect( view.viewModel ).to.equal( model );
		expect( view.computeds ).to.equal( obj );
		expect( view.bindings ).to.equal( "my-binding" );
		expect( view.bindingFilters ).to.equal( obj );
		expect( view.bindingHandlers ).to.equal( obj );
		expect( view.bindingSources ).to.exist; // << "obj" is copied, so has new identity.
	});


	it("should allow Epoxy view configuration to mixin with another Backbone View.", function() {
		var MixinView = Backbone.View.extend({
			el: "<div data-bind='text:ship'></div>",
			model: new Backbone.Model({ship:"Deathstar"}),
			initialize: function() {
				this.applyBindings();
			}
		});

		Backbone.Epoxy.View.mixin( MixinView.prototype );
		var view = new MixinView();
		
		expect( view.$el.text() ).to.equal( "Deathstar" );
	});


	it("should bind view elements to model via binding selector map.", function() {
		var $el = $("#tmpl-view .user-first");
		expect( $el.text() ).to.equal( "Luke" );
	});


	it("should bind view elements to model via element attribute query.", function() {
		var $el = $("#dom-view .test-text-first");
		expect( $el.text() ).to.equal( "Luke" );
	});


	it("should include top-level view container in bindings searches.", function() {

		var view1 = new (Backbone.Epoxy.View.extend({
			el: "<span data-bind='text:firstName'></span>",
			model: dataModel,
			bindings: "data-bind"
		}));

		var view2 = new (Backbone.Epoxy.View.extend({
			el: "<span class='first-name'></span>",
			model: dataModel,
			bindings: {
				".first-name": "text:firstName"
			}
		}));

		expect( view1.$el.text() ).to.equal( "Luke" );
		expect( view2.$el.text() ).to.equal( "Luke" );
	});

	it("should include top-level view container in bindings searches via :el selector.", function() {

		var view = new (Backbone.Epoxy.View.extend({
			el: "<span></span>",
			model: dataModel,
			bindings: {
				":el": "text:firstName"
			}
		}));

		expect( view.$el.text() ).to.equal( "Luke" );
	});

	it("should throw error in response to undefined property bindings.", function() {

		var ErrorView = Backbone.Epoxy.View.extend({
			el: "<div><span data-bind='text:undefinedProp'></span></div>",
			model: dataModel,
			bindings: "data-bind"
		});

		function testForError(){
			var error = new ErrorView();
		}

		expect( testForError ).to.throw();
	});


	it("should allow custom bindings to set data into the view.", function() {
		var $els = $(".test-custom-binding");
		expect( $els.text() ).to.equal( "b" );
		viewModel.set("checkList", ["c","a"]);
		expect( $els.text() ).to.equal( "a, c" );
	});


	it("should allow custom bindings to get data from the view.", function() {
		var $el = $(".test-yes-no");
		expect( $el.val() ).to.equal( "Y" );

		// Change through model, look for view change:
		dataModel.set("active", false);
		expect( $el.val() ).to.equal( "N" );

		// Change through view, look for model change:
		$el.val( "Y" ).trigger( "change" );
		expect( dataModel.get("active") ).to.equal( true );
	});


	it("should use '.getBinding()' to read data from binding sources.", function() {
		expect( modView.getBinding("firstName") ).to.equal( "Luke" );
	});


	it("should use '.setBinding()' to write data into binding sources.", function() {
		var $el = $(".test-text-first");
		modView.setBinding( "firstName", "Leia" );
		expect( dataModel.get("firstName") ).to.equal( "Leia" );
		expect( $el.text() ).to.equal( "Leia" );
	});


	it("should generate computed view properties based on '.computeds' hash.", function() {
		expect( domView.getBinding("checkedCount") ).to.equal( "Checked items: 1" );
		domView.viewModel.modifyArray("checkList", "push", "c");
		expect( domView.getBinding("checkedCount") ).to.equal( "Checked items: 2" );
	});


	it("should allow view bindings to map through computed properties.", function() {
		var $el = $(".test-view-computed");
		expect( $el.text() ).to.equal( "Checked items: 1" );
		domView.viewModel.modifyArray("checkList", "push", "c");
		expect( $el.text() ).to.equal( "Checked items: 2" );
	});


	it("should inject manual dependency declarations as computed getter arguments.", function() {
		expect( domView.getBinding("nameDisplay") ).to.equal( "<strong>Skywalker</strong>, Luke" );
	});


	it("should allow computed view properties to recieve and store data.", function() {
		expect( domView.nameDisplaySetterValue ).to.be.undefined;
		domView.setBinding("nameDisplay", "hello");
		expect( domView.nameDisplaySetterValue ).to.equal( "hello" );
	});


	it("should allow multiple data sources and their namespaced attributes to be defined through 'bindingSources'.", function() {
		var m1 = new Backbone.Model({name: "Luke"});
		var m2 = new Backbone.Collection();
		var m3 = new Backbone.Model({name: "Han"});
		var m4 = new Backbone.Collection();
		var v1, v2, v3, v4, v5, v6;

		var sourceView = new (Backbone.Epoxy.View.extend({
			el: "<div data-bind='b1:$model, b2:$collection, b3:$mod2, b4:$col2, b5:name, b6:mod2_name'></div>",
			model: m1,
			collection: m2,
			bindingSources: {
				mod2: m3,
				col2: m4
			},
			bindingHandlers: {
				b1: function( $el, value ) {
					v1 = value;
				},
				b2: function( $el, value ) {
					v2 = value;
				},
				b3: function( $el, value ) {
					v3 = value;
				},
				b4: function( $el, value ) {
					v4 = value;
				},
				b5: function( $el, value ) {
					v5 = value;
				},
				b6: function( $el, value ) {
					v6 = value;
				}
			}
		}));

		expect( v1 ).to.equal( m1 );
		expect( v2 ).to.equal( m2 );
		expect( v3 ).to.equal( m3 );
		expect( v4 ).to.equal( m4 );
		expect( v5 ).to.equal( "Luke" );
		expect( v6 ).to.equal( "Han" );
	});


	it("binding 'attr:' should establish a one-way binding with an element's attribute definitions.", function() {
		var $el = $(".test-attr-multi");
		expect( $el.attr("href") ).to.equal( "b" );
		expect( $el.attr("title") ).to.equal( "b" );
		dataModel.set("preference", "c");
		expect( $el.attr("href") ).to.equal( "c" );
		expect( $el.attr("title") ).to.equal( "c" );
	});


	it("binding 'attr:' should allow string property definitions.", function() {
		var $el = $(".test-attr");
		expect( $el.attr("data-active") ).to.equal( "true" );
		dataModel.set("active", false);
		expect( $el.attr("data-active") ).to.equal( "false" );
	});


	it("binding 'checked:' should establish a two-way binding with a radio group.", function() {
		var $a = $(".preference[value='a']");
		var $b = $(".preference[value='b']");
		expect( $a.prop("checked") ).to.equal( false );
		expect( $b.prop("checked") ).to.equal( true );
		$a.prop("checked", true).trigger("change");
		expect( dataModel.get("preference") ).to.equal( "a" );
	});


	it("binding 'checked:' should establish a two-way binding between a checkbox and boolean value.", function() {
		var $el = $(".test-checked-boolean");
		expect( $el.prop("checked") ).to.equal( true );
		$el.prop("checked", false).trigger("change");
		expect( dataModel.get("active") ).to.equal( false );
	});


	it("binding 'checked:' should set a checkbox series based on a model array.", function() {
		var $els = $(".check-list");

		// Default: populate based on intial setting:
		expect( !!$els.filter("[value='b']" ).prop("checked") ).to.equal( true );
		expect( !!$els.filter("[value='c']" ).prop("checked") ).to.equal( false );

		// Add new selection to the checkbox group:
		viewModel.set("checkList", ["b", "c"]);
		expect( !!$els.filter("[value='b']" ).prop("checked") ).to.equal( true );
		expect( !!$els.filter("[value='c']" ).prop("checked") ).to.equal( true );
	});


	it("binding 'checked:' should respond to model changes performed by '.modifyArray'.", function() {
		var $els = $(".check-list");

		// Add new selection to the checkbox group:
		expect( !!$els.filter("[value='b']" ).prop("checked") ).to.equal( true );
		expect( !!$els.filter("[value='c']" ).prop("checked") ).to.equal( false );
		viewModel.modifyArray("checkList", "push", "c");
		expect( !!$els.filter("[value='b']" ).prop("checked") ).to.equal( true );
		expect( !!$els.filter("[value='c']" ).prop("checked") ).to.equal( true );
	});


	it("binding 'checked:' should get a checkbox series formatted as a model array.", function() {
		var $els = $(".check-list");
		dataModel.set("checkList", ["b"]);

		// Default: populate based on intial setting:
		expect( !!$els.filter("[value='b']" ).prop("checked") ).to.equal( true );
		$els.filter("[value='a']").prop("checked", true).trigger("change");
		expect( viewModel.get("checkList").join(",") ).to.equal( "b,a" );
	});


	it("binding 'classes:' should establish a one-way binding with an element's class definitions.", function() {
		var $el = $(".test-classes").eq(0);
		expect( $el.hasClass("error") ).to.equal( false );
		expect( $el.hasClass("active") ).to.equal( true );
		dataModel.set({
			firstName: "",
			active: false
		});
		expect( $el.hasClass("error") ).to.equal( true );
		expect( $el.hasClass("active") ).to.equal( false );
	});


	it("binding 'collection:' should update display in response Backbone.Collection 'reset' events.", function() {
		var $el = $(".test-collection");

		modView.collection.reset([
			{name: "Luke Skywalker"}
		]);
		expect( $el.children().length ).to.equal( 1 );

		modView.collection.reset([
			{name: "Hans Solo"},
			{name: "Chewy"}
		]);
		expect( $el.children().length ).to.equal( 2 );
	});


	it("binding 'collection:' should update display in response Backbone.Collection 'add' events.", function() {
		var $el = $(".test-collection");

		modView.collection.add({name: "Luke Skywalker"});
		expect( $el.children().length ).to.equal( 1 );

		modView.collection.add([
			{name: "Hans Solo"},
			{name: "Chewy"}
		]);
		expect( $el.children().length ).to.equal( 3 );
	});


	it("binding 'collection:' should update display in response Backbone.Collection 'remove' events.", function() {
		var $el = $(".test-collection");

		modView.collection.add({name: "Luke Skywalker"});
		expect( $el.children().length ).to.equal( 1 );

		modView.collection.remove( modView.collection.at(0) );
		expect( $el.children().length ).to.equal( 0 );
	});


	it("binding 'collection:' should update display in response Backbone.Collection 'sort' events.", function() {
		var $el = $(".test-collection");

		modView.collection.reset([
			{name: "B"},
			{name: "A"}
		]);
		expect( $el.find(":first-child .name-dsp").text() ).to.equal( "B" );

		modView.collection.comparator = function( model ) { return model.get("name"); };
		modView.collection.sort();
		modView.collection.comparator = null;

		expect( $el.find(":first-child .name-dsp").text() ).to.equal( "A" );
	});

	it("binding 'collection:' child views should update display based on their model bindings.", function() {
		var modViewWithInitialCollection = new (Backbone.Epoxy.View.extend({
			collection: new TestCollection([{name: "A"}]),
			el: "<div data-bind='collection:$collection'></div>",
		}));

		expect( modViewWithInitialCollection.$el.find(":first-child .name-dsp").text() ).to.equal( "A" );

		modViewWithInitialCollection.collection.first().set({name: "B"})
		expect( modViewWithInitialCollection.$el.find(":first-child .name-dsp").text() ).to.equal( "B" );
	});

	it("binding 'css:' should establish a one-way binding with an element's css styles.", function() {
		var $el = $(".test-css");
		expect( $el.css("display") ).to.equal( "none" );
		dataModel.set( "lastName", "" );
		expect( $el.css("display") ).to.equal( "block" );
	});


	it("binding 'disabled:' should establish a one-way binding with an element's disabled state.", function() {
		var $el = $(".test-disabled");
		expect( $el.prop("disabled") ).to.be.true;
		dataModel.set( "active", false );
		expect( $el.prop("disabled") ).to.be.false;
	});


	it("binding 'enabled:' should establish a one-way binding with an element's inverted disabled state.", function() {
		var $el = $(".test-enabled");
		expect( $el.prop("disabled") ).to.be.false;
		dataModel.set( "active", false );
		expect( $el.prop("disabled") ).to.be.true;
	});


	it("binding 'events:' should configure additional DOM event triggers.", function() {
		var $el = $(".test-input-first");
		expect( $el.val() ).to.equal( "Luke" );
		$el.val( "Anakin" ).trigger("keyup");
		expect( dataModel.get("firstName") ).to.equal( "Anakin" );
	});


	it("binding 'html:' should establish a one-way binding with an element's html contents.", function() {
		var $el = $(".test-html");
		// Compare markup as case insensitive to accomodate variances in browser DOM styling:
		expect( $el.html() ).to.match( /<strong>Skywalker<\/strong>, Luke/i );
		dataModel.set("firstName", "Anakin");
		expect( $el.html() ).to.match( /<strong>Skywalker<\/strong>, Anakin/i );
	});


	it("binding 'options:' should bind an array of strings to a select element's options.", function() {
		var $el = $(".test-select");
		viewModel.set("optionsList", ["Luke", "Leia"]);
		expect( $el.children().length ).to.equal( 2 );
		expect( $el.find(":first-child").attr("value") ).to.equal( "Luke" );
		expect( $el.find(":first-child").text() ).to.equal( "Luke" );
	});


	it("binding 'options:' should bind an array of label/value pairs to a select element's options.", function() {
		var $el = $(".test-select");
		viewModel.set("optionsList", [
			{label:"Luke", value:"a"},
			{label:"Leia", value:"b"}
		]);

		expect( $el.children().length ).to.equal( 2 );
		expect( $el.find(":first-child").attr("value") ).to.equal( "a" );
		expect( $el.find(":first-child").text() ).to.equal( "Luke" );
	});


	it("binding 'options:' should bind a collection of model label/value attributes to a select element's options.", function() {
		var $el = $(".test-select-collect");
		modView.collection.reset([
			{label:"Luke Skywalker", value:"Luke"},
			{label:"Han Solo", value:"Han"}
		]);

		expect( $el.children().length ).to.equal( 2 );
		expect( dataModel.get("valCollect") ).to.equal( "Luke" );
	});


	it("binding 'options:' should update selection when additional items are added/removed.", function() {
		var $el = $(".test-select");
		viewModel.modifyArray("optionsList", "push", {label:"Leia", value:"3"});

		expect( $el.children().length ).to.equal( 4 );
		expect( $el.find(":last-child").attr("value") ).to.equal( "3" );
		expect( $el.find(":last-child").text() ).to.equal( "Leia" );
	});


	it("binding 'options:' should preserve previous selection state after binding.", function() {
		var $el = $(".test-select");
		viewModel.modifyArray("optionsList", "push", {label:"Leia", value:"3"});
		expect( $el.children().length ).to.equal( 4 );
		expect( $el.val() ).to.equal( "1" );
	});


	it("binding 'options:' should update the bound model value when the previous selection is no longer available.", function() {
		var $el = $(".test-select-default");
		expect( dataModel.get("valDefault") ).to.equal( "1" );
		viewModel.set("optionsList", []);
		expect( dataModel.get("valDefault") ).to.equal( "default" );
	});


	it("binding 'options:' should update a bound multiselect value when the previous selection is no longer available.", function() {
		var $el = $(".test-select-multi");

		// Set two options as selected, and confirm they appear within the view:
		dataModel.set("valMulti", ["1", "2"]);
		expect( $el.val().join(",") ).to.equal( "1,2" );

		// Remove one option from the list, then confirm the model captures the revised selection:
		viewModel.modifyArray("optionsList", "splice", 1, 1);
		expect( dataModel.get("valMulti").join(",") ).to.equal( "2" );
	});


	it("binding 'optionsDefault:' should include a default first option in a select menu.", function() {
		var $el = $(".test-select-default");
		expect( $el.children().length ).to.equal( 4 );
		expect( $el.find(":first-child").text() ).to.equal( "default" );
	});


	it("binding 'optionsDefault:' should bind the default option value to a model.", function() {
		var $el = $(".test-select-default");
		viewModel.set("optDefault", {label:"choose...", value:""});
		expect( $el.find(":first-child").text() ).to.equal( "choose..." );
	});


	it("binding 'optionsEmpty:' should provide a placeholder option value for an empty select.", function() {
		var $el = $(".test-select-empty");
		expect( $el.children().length ).to.equal( 3 );
		viewModel.set("optionsList", []);
		expect( $el.children().length ).to.equal( 1 );
		expect( $el.find(":first-child").text() ).to.equal( "empty" );
	});


	it("binding 'optionsEmpty:' should bind the empty placeholder option value to a model.", function() {
		var $el = $(".test-select-empty");
		viewModel.set("optionsList", []);
		viewModel.set("optEmpty", {label:"---", value:""});
		expect( $el.find(":first-child").text() ).to.equal( "---" );
	});


	it("binding 'optionsEmpty:' should disable an empty select menu.", function() {
		var $el = $(".test-select-empty");
		viewModel.set("optionsList", []);
		expect( $el.prop("disabled") ).to.equal( true );
	});


	it("binding 'optionsDefault:' should supersede 'optionsEmpty:' by providing a default item.", function() {
		var $el = $(".test-select-both");

		// Empty the list, expect first option to still be the default:
		viewModel.set("optionsList", []);
		expect( $el.find(":first-child").text() ).to.equal( "default" );

		// Empty the default, now expect the first option to be the empty placeholder.
		viewModel.set("optDefault", "");
		expect( $el.find(":first-child").text() ).to.equal( "empty" );
	});


	it("binding 'template:' should render a bound Model with a provided template reference.", function() {
		var $el = $(".test-template");

	});


	it("binding 'template:' should render a bound Object with a provided template reference.", function() {
		var $el = $(".test-template");

	});


	it("binding 'text:' should establish a one-way binding with an element's text contents.", function() {
		var $el = $(".test-text-first");
		expect( $el.text() ).to.equal( "Luke" );
		dataModel.set("firstName", "Anakin");
		expect( $el.text() ).to.equal( "Anakin" );
	});


	it("binding 'toggle:' should establish a one-way binding with an element's visibility.", function() {
		var $el = $(".test-toggle");
		expect( isVisible($el) ).to.equal( true );
		dataModel.set("active", false);
		expect( isVisible($el) ).to.equal( false );
	});


	it("binding 'value:' should set a value from the model into the view.", function() {
		var $el = $(".test-input-first");
		expect( $el.val() ).to.equal( "Luke" );
	});


	it("binding 'value:' should set an array value from the model to a multiselect list.", function() {
		var $el = $(".test-select-multi");
		expect( $el.val().length ).to.equal( 1 );
		dataModel.set("valMulti", ["1", "2"]);
		expect( $el.val().length ).to.equal( 2 );
		expect( $el.val().join(",") ).to.equal( "1,2" );
	});


	it("binding 'value:' should set a value from the view into the model.", function() {
		var $el = $(".test-input-first");
		$el.val( "Anakin" ).trigger("change");
		expect( dataModel.get("firstName") ).to.equal( "Anakin" );
	});


	it("operating with not() should negate a binding value.", function() {
		var $el = $(".test-mod-not");
		expect( isVisible($el) ).to.equal( false );
		dataModel.set("active", false);
		expect( isVisible($el) ).to.equal( true );
	});


	it("operating with all() should bind true when all bound values are truthy.", function() {
		var $el = $(".test-mod-all");
		expect( $el.hasClass("hilite") ).to.equal( true );
		dataModel.set("firstName", "");
		expect( $el.hasClass("hilite") ).to.equal( false );
	});


	it("operating with none() should bind true when all bound values are falsy.", function() {
		var $el = $(".test-mod-none");
		expect( $el.hasClass("hilite") ).to.equal( false );
		dataModel.set({
			firstName: "",
			lastName: ""
		});
		expect( $el.hasClass("hilite") ).to.equal( true );
	});


	it("operating with any() should bind true when any bound value is truthy.", function() {
		var $el = $(".test-mod-any");
		expect( $el.hasClass("hilite") ).to.equal( true );
		dataModel.set("firstName", "");
		expect( $el.hasClass("hilite") ).to.equal( true );
		dataModel.set("lastName", "");
		expect( $el.hasClass("hilite") ).to.equal( false );
	});


	it("operating with format() should bind true when any bound value is truthy.", function() {
		var $el = $(".test-mod-format");
		expect( $el.text() ).to.equal( "Name: Luke Skywalker" );
		dataModel.set({
			firstName: "Han",
			lastName: "Solo"
		});
		expect( $el.text() ).to.equal( "Name: Han Solo" );
	});


	it("operating with select() should perform a ternary return from three values.", function() {
		var $el = $(".test-mod-select");
		expect( $el.text() ).to.equal( "Luke" );
		dataModel.set("active", false);
		expect( $el.text() ).to.equal( "Skywalker" );
	});


	it("operating with length() should assess the length of an array/collection.", function() {
		var $el = $(".test-mod-length");
		expect( $el.hasClass("hilite") ).to.equal( true );
		viewModel.set("checkList", []);
		expect( $el.hasClass("hilite") ).to.equal( false );
	});
});
