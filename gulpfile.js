const gulp = require('gulp');

const es        = require('event-stream');
const sequence  = require('run-sequence');
const plumber   = require('gulp-plumber');
const print     = require('gulp-print');
const bower     = require('main-bower-files');
const util      = require('gulp-util');

const merge     = require('merge2');
const rename    = require('gulp-rename');
const clean     = require('gulp-clean');
const filter    = require('gulp-filter');
const concat    = require('gulp-concat');
const unique    = require('gulp-unique-files');
const favicons  = require('gulp-favicons');
const less      = require('gulp-less');
const inject    = require('gulp-inject');
const uglify    = require('gulp-uglify');
const minifyCSS = require('gulp-minify-css');
const flatten   = require('gulp-flatten');
const install   = require("gulp-install");

// default : watch
gulp.task('watch', function(){
  gulp.watch('./bower_components/**/*', ['bower']);
  gulp.watch(['./assets/**/*.{less,png,jpg,js,eot,svg,ttf,woff,woff2}', './resources/favicon.png'], ['assets']);
});

gulp.task('build', [
  'bower',
  'assets'
]);

gulp.task('default', [
  'build',
  'watch'
]);

// bower
gulp.task('bower', [
  'bower:style',
  'bower:script',
  'bower:fonts'
]);

gulp.task('bower:style', function(){
  return merge(
      gulp.src(bower())
        .pipe(filter(['**/*.less']))
        .pipe(less()),
      gulp.src(bower())
        .pipe(filter(['**/*.css']))
    )
    .pipe(plumber())
    .pipe(print())
    .pipe(concat('vendor.css'))
    .pipe(minifyCSS())
    .pipe(gulp.dest('./dist/style'));
});

gulp.task('bower:script', function(){
  return gulp.src(bower())
    .pipe(plumber())
    .pipe(filter(['**/*.js']))
    .pipe(print())
    .pipe(concat('vendor.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/script'));
});

gulp.task('bower:fonts', function(){
  return gulp.src(bower())
    .pipe(plumber())
    .pipe(filter(['**/*.eot', '**/*.svg', '**/*.ttf', '**/*.woff', '**/*.woff2']))
    .pipe(print())
    .pipe(gulp.dest('./dist/fonts'));
});

// assets
gulp.task('assets', [
  'assets:style',
  'assets:img',
  'assets:script',
  'assets:fonts'
]);

gulp.task('assets:style', function(){
  var sources = gulp.src([
      '!./assets/style/imports.less',
      './assets/style/vars.less',
      './assets/style/animations.less',
      './assets/style/mixins/**/*.less',
      './assets/style/**/*.less',
    ], {read: false})
    .pipe(unique())
    .pipe(print());

  return gulp.src('./assets/style/imports.less')
    .pipe(inject(sources, {
      starttag: '/* inject:imports */',
      endtag: '/* endinject */',
      transform: function (path) {
        return '@import ".' + path + '";';
      }
    }))
    .pipe(plumber())
    .pipe(less())
    .pipe(minifyCSS())
    .pipe(rename('app.css'))
    .pipe(gulp.dest('./dist/style'));
});

gulp.task('assets:img', function(){
  return gulp.src('./assets/img/**/*.{png,jpg}')
    .pipe(plumber())
    .pipe(print())
    .pipe(gulp.dest('./dist/img'));
});

gulp.task('assets:script', function(){
  return gulp.src('./assets/**/*.js')
    .pipe(plumber())
    .pipe(print())
    .pipe(concat('app.js'))
    .pipe(uglify())
    .pipe(gulp.dest('./dist/script'));
});

gulp.task('assets:fonts', function(){
  return gulp.src('./assets/**/*.{eot,svg,ttf,woff,woff2}')
    .pipe(plumber())
    .pipe(flatten())
    .pipe(print())
    .pipe(gulp.dest('./dist/fonts'));
});
