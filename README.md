# htmlbuild-functions
Reusable functions for [gulp-htmlbuild](//github.com/Janpot/gulp-htmlbuild).

## API

### htmlbuildFunctions.streamScript(stream, cwd, min)

Creates processor that extracts script paths from the block and pipes it to the given stream
as [vinyl files](//github.com/wearefractal/vinyl) (compatible with `gulp.src`).

Argument `cwd` is current working directory which script src paths are relative to.

Processor looks for `script` elements with attribute `[data-]min-src`, `[data-]target-src` or `src` exactly in this order.
Extracting minified version of the script can be disabled by setting `min` value to `false.`

```javascript
var es = require('event-stream'),
	concat = require('gulp-concat'),
	builders = require('htmlbuild-functions'),
	stream = es.through();
gulp.src('index.html')
	.pipe(htmlbuild({scripts: builders.streamScript(stream, 'src')}));
return stream
	.pipe(concat('scripts.js'))
	.pipe(gulp.dest('build');
```

```html
<!-- htmlbuild:scripts -->
<script src="../bower_components/jquery/dist/jquery.js"
		min-src="../bower_components/jquery/dist/jquery.min.js"></script>
<script src="../bower_components/angular/angular.js"
		min-src="../bower_components/angular/angular.min.js"></script>
<!-- endbuild -->
```

### htmlbuildFunctions.streamStylesheet(stream, cwd, min)

Works in same way `htmlbuildFunctions.streamScript(stream, cwd, min)` does, but unlike the one,
it looks for `link` elements with attribute `[data-]min-href`, `[data-]target-href` or `href`.

### htmlbuildFunctions.replaceScript(src)

Replaces block with `script` tag with given `src` value`.

```javascript
var htmlbuild = require('gulp-htmlbuild'),
	builders = require('htmlbuild-functions');
return gulp.src('index.html')
	.pipe(htmlbuild({scripts: builders.replaceScript('scripts.js')}))
	.pipe(gulp.dest('build');
```

```html
<!-- htmlbuild:scripts -->
<script src="../bower_components/jquery/dist/jquery.js"
		min-src="../bower_components/jquery/dist/jquery.min.js"></script>
<script src="../bower_components/angular/angular.js"
		min-src="../bower_components/angular/angular.min.js"></script>
<!-- endbuild -->
```

Example above produces `index.html` with content:

```html
<script src="scripts.js"></script>
```
### htmlbuildFunctions.replaceStylesheet(href)

Works in same way `htmlbuildFunctions.replaceScript(src)` does, but produces `link` tag with `href` attribute.
