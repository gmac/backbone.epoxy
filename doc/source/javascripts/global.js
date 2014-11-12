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
	
	// Example view controller:
	if (typeof Backbone !== 'undefined') {
		// Scenario mini-application views:
		var ExampleView = Backbone.View.extend({
			initialize: function() {
				this.setTab("js");
				this.$(".tabs").show();
		
				var js = this.$("code.js");
				var html = this.$("code.html");
				var run = new Function( js.text() );
				this.$el.append( "<b class='result'>Result:</b>" );
				this.$el.append( $(html.text()).addClass("app") );
				run();
			},
			
			setTab: function( id ) {
				// Set tab selection state:
				this.$(".tabs li")
					.removeClass("active")
					.filter("[data-tab='"+id+"']")
					.addClass("active");
		
				// Set visible panel:
				this.$("pre").hide();
				this.$("code."+id).parent().show();
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
	
}());


// Syntax highlight (lazy render):
(function() {
	var elements = $("code.js, code.html");
	var i = 0;
	
	// Request Animation Frame method:
	var requestAnimFrame = window.requestAnimationFrame ||
		window.webkitRequestAnimationFrame ||
		window.mozRequestAnimationFrame ||
		function( callback ) {
			window.setTimeout(callback, 1000 / 60);
		};

	function syntaxJs( code ) {
		return code
			.replace(/(".*?")/g, "<span class='str'>$1</span>") // << strings
			.replace(/(^|\s)(\/\/.+)/g, "$1<span class='cmt'>$2</span>") // << comments
			.replace(/(^|[\(\){}:\s\.])(var|function|this|new|return|true|false|if)([\(\){}:\s\.])/g, "$1<span class='kwd'>$2</span>$3"); // << keywords
	}

	function syntaxHtml( code ) {
		return code
			.replace(/(&lt;.*?&gt;)/g, "<span class='tag'>$1</span>") // << tags
			.replace(/(".*?")/g, "<span class='str'>$1</span>"); // << strings
	}
	
	function renderSyntax() {
		var el = elements.eq(i++);
		var highlight = el.hasClass("js") ? syntaxJs : syntaxHtml;
		el.html( highlight(el.html()) );
		
		if ( i < elements.length ) {
			requestAnimFrame( renderSyntax );
		}
	}
	
	if ( elements.length ) {
		requestAnimFrame( renderSyntax );
	}
}());
