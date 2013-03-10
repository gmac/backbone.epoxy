module.exports = function( grunt ) {

	grunt.initConfig({
		concat: {
			dist: {
				src: [
					'backbone.epoxy-model.js',
					'backbone.epoxy-view.js'
				],
				dest: 'backbone.epoxy.min.js'
			}
		},
		min: {
			model: {
				src: 'backbone.epoxy-model.js',
				dest: 'backbone.epoxy-model.min.js'
			},
			view: {
				src: 'backbone.epoxy-view.js',
				dest: 'backbone.epoxy-view.min.js'
			},
			epoxy: {
				src: 'backbone.epoxy.min.js',
				dest: 'backbone.epoxy.min.js'
			}
		}
	});
	
	grunt.registerTask("default", "concat min");
};