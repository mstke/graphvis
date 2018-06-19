'use strict';

var conf = require('./conf'),
    connect = require('gulp-connect'),
    gulp = require('gulp');

gulp.task('connect', function() {
    connect.server({
        port:8081,
        livereload: true,
        root: conf.paths.docs
    });
});
