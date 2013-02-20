module.exports = function( grunt ) {

	grunt.initConfig({
		min: {
			js: {
				src: 'backbone.epoxy.js',
				dest: 'backbone.epoxy.min.js'
			}
		}
	});
	
	grunt.registerTask("default", "min");
};