module.exports = function( grunt ) {

	grunt.initConfig({
		min: {
			epoxy: {
				src: 'backbone.epoxy.js',
				dest: 'backbone.epoxy.min.js'
			}
		}
	});
	
	grunt.registerTask("default", "min");
};