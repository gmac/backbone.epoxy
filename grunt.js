module.exports = function( grunt ) {

	grunt.initConfig({
		min: {
			/*js: {
				src: 'backbone.epoxy.js',
				dest: 'backbone.epoxy.min.js'
			},*/
			model: {
				src: 'backbone.epoxy-model.js',
				dest: 'backbone.epoxy-model.min.js'
			},
			view: {
				src: 'backbone.epoxy-view.js',
				dest: 'backbone.epoxy-view.min.js'
			}
		},
		concat: {
			dist: {
				src: [
					'backbone.epoxy-model.min.js',
					'backbone.epoxy-view.min.js'
				],
				dest: 'backbone.epoxy.min.js'
			}
		}
	});
	
	grunt.registerTask("default", "min concat");
};