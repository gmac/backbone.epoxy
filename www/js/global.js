(function() {
	
	// TOC controller:
	$(function() {
		var $nav = $(".navigation").addClass("fixed");
		var $main = $nav.find(".nav-main").children();
		var $toc = $nav.find(".nav-toc");

		if ( $toc.length ) {
			var $win = $(window);
			var delta = $main.eq(0).height() * $main.length;
		
			function setHeight() {
				$toc.height( $win.height()-delta );
			}
		
			// Fixed TOC height:
			$win.on("resize", setHeight);
			setHeight();
		}
	});


	if (this.Backbone) {
		// Scenario mini-application views:
		var ExampleView = this.Backbone.View.extend({
			initialize: function() {
				this.setTab("js");
				this.$(".tabs").show();
		
				var js = this.$(".js code");
				var html = this.$(".html code");
				var run = new Function( js.text() );
				this.$el.append( "<b class='result'>Result:</b>" );
				this.$el.append( $(html.text()).addClass("app") );
				//this.$("code").height( Math.max(js.height(), html.height()) );
				run();
			},

			setTab: function( id ) {
				// Set tab selection state:
				this.$(".tabs li")
					.removeClass("active")
					.filter("[data-tab='"+id+"']")
					.addClass("active");
		
				// Set visible panel:
				this.$("pre").hide().filter("."+id).show();
			},
	
			events: {
				"click .tabs li": "onTab"
			},
	
			onTab: function(evt) {
				var tab = $(evt.target).closest("li");
				this.setTab( tab.attr("data-tab") );
			}
		});


		// Create all scenario applications:
		$(".example").each(function() {
			var view = new ExampleView({el: this});
		});
	}

	// "Run" button behaviors:
	$(document).on("click", "button.run", function(evt) {
		var js = $(evt.target).parent().find("code").text();
		var run = new Function(js);
		run();
	});
	
}).call( this );