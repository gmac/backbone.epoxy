# Epoxy.js : Data Binding for Backbone

[Epoxy.js](http://epoxyjs.org "Epoxy.js") is an elegant and extensible data binding library for [Backbone.js](http://backbonejs.org "Backbone.js"); it provides feature-rich extensions of Backbone's `Model` and `View` components designed to hook view elements directly to data models. Epoxy captures some great aspects of [Knockout.js](http://knockoutjs.com "Knockout.js") and [Ember.js](http://emberjs.com "Ember.js") in a familiar API that feels tastefully like Backbone, with minimal additional file size (~10k min, 2k gzip). Some key features in Epoxy include:</p>

 - Computed Model & View Attributes
 - Declarative View Bindings
 - Automated Dependency Mapping
 - Automatic View Updates

Epoxy builds on [jQuery](http://jquery.com "jQuery.js")/[Zepto](http://zeptojs.com/ "Zepto.js")+[Backbone](http://backbonejs.org "Backbone.js") and works where they work: IE6+, Firefox 3+, Safari, Chrome.

## Installation

Epoxy requires [jQuery](http://jquery.com "jQuery.js") 1.7.0+, [Underscore](http://underscorejs.org "Underscore.js") 1.4.3+, and [Backbone](http://backbonejs.org "Backbone.js") 0.9.9+. To quickly install Epoxy, download the full Epoxy library (`backbone.epoxy.min.js`) and include its script tag in your document after all dependencies:

	<script src="jquery-min.js"></script>
	<script src="underscore-min.js"></script>
	<script src="backbone-min.js"></script>
	<script src="backbone.epoxy.min.js"></script>

You may choose to replace jQuery with [Zepto](http://zeptojs.com/ "Zepto.js") and/or Underscore with [Lo-Dash](http://lodash.com "Lodash.js"). Also remember to include the [json2](https://github.com/douglascrockford/JSON-js "JSON2") library when targeting IE6/7.

## Help & Documentation

For all complete information and documentation, visit the project's website at [epoxyjs.org](http://epoxyjs.org "Epoxy.js").


## Change Log

**1.0.0** – *June 28, 2013* - [Diff](https://github.com/gmac/backbone.epoxy/compare/v0.12.8...v1.0.0 "Diff: v0.12.8/v1.0.0")

Two-way filtering, set/save options, cleanup.

 - Final implementation and docs on two-way binding filters.
 - Adds `setterOptions` property to be passed into bound setters.
 - Adds `{save: true}` option for writing to model via `.save()`.
 - Small codebase optimizations, cleanup, and bug fixes.


**0.12.8** – *June 3, 2013* - [Diff](https://github.com/gmac/backbone.epoxy/compare/v0.12.0...v0.12.8 "Diff: v0.12.0/v0.12.8")

Bug fixes and performance optimizations.

 - Bug fix to `Epoxy.View.remove()` implementation (thanks @pixelbreaker).
 - Adds binding support for HTML `contenteditable="true"` elements (thanks @leovarg67).
 - Adds bindings parser caching for improved performance (thanks @dspangen).
 - Adds compatibility with [Zepto](http://zeptojs.com/ "Zepto.js").
 - Additional error hooks/messaging for improved debugging.
 - Small codebase optimizations and bug fixes.

**0.12.0** – *April 2, 2013* - [Diff](https://github.com/gmac/backbone.epoxy/compare/v0.11.0...v0.12.0 "Diff: v0.11.0/v0.12.0")

Major reorganization of core features to improve workflow patterns.

 - Removes `observableDefaults` and `addObservable` APIs.
 - Renames former "observable" model methods to `hasComputed`, `removeComputed`, and `clearComputeds`.
 - Adds `viewModel` property to view as sanctioned store for view-specific data.
 - Adds `computeds` hash table to view for defining computed view properties.
 - Adds static `mixin` APIs for applying Epoxy configuration to other base classes.
 - Adds dependency injection to computed getters defining a `deps` array.
 - Adds two-way data exchange to binding filters, and adds `integer`, `decimal`, and `csv` filters.
 - Configures class constructors to pull configuration out of passed options.
 - Revised documentation.

**0.11.0** – *March 25, 2013* – [Diff](https://github.com/gmac/backbone.epoxy/compare/v0.10.1...v0.11.0 "Diff: v0.10.1/v0.11.0")

Adds final features planned for 1.0 release.

 - Adds `template` binding for rendering data attributes with an Underscore template.
 - Adds `bindingFilters` namespace for defining custom data filters.
 - Defines `binding` API for core configuration and add-ons.
 - Browser compatibility fixes to the `options` binding.
 - Refactoring for performance (at slight expense to file size).
 - Adds environment setup and AMD definition, courtesy of jpurcell001 and Marionette.
 - The notion of "operators" is officially reclassified as "filters".
 - Revised docs.

**0.10.1** – *March 21, 2013* – [Diff](https://github.com/gmac/backbone.epoxy/compare/v0.10.0...v0.10.1 "Diff: v0.10.0/v0.10.1")

Large codebase refactoring.

 - Shifts bindings from element level down to the handler level.
 - Opens default binding handlers, operators, and options to a public API.

**0.10.0** – *March 19, 2013* – [Diff](https://github.com/gmac/backbone.epoxy/compare/v0.9.0...v0.10.0 "Diff: v0.9.0/v0.10.0")

Adds additional binding features to stage for a 1.0 release.

 - Adds select menu `options` binding suite and supporting tests; includes:
 	- `options` : Binds the contents of an Array or Collection to select menu options.
	- `optionsDefault` : Provides a default option to include above `options` items.
	- `optionsEmpty` : Provides an empty placeholder option to display when `options` is empty.
 - Registers `"update"` event on collection sources for manually triggering binding updates.
 - Adds return values to all model methods.
 - Upgrades to Uglify2 for better gzip compression.
 - General refactoring and additional code comments.
 - Documentation updates and corrections.

**0.9.0** – *March 12, 2013*

Initial release of Epoxy core features.
