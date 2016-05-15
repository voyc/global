# build voyc

# Note that three tools are used, located in /home/jhagstrand/bin
#   yuicompressor
#   jsdoc
#   PhpDocumentor

# concatenate the js and css files 
cat html/js/bounds.js html/js/dashboard.js html/js/detail.js html/js/dispatch.js html/js/layout.js html/js/map.js html/js/mapcard.js html/js/mapdot.js html/js/maplevel.js html/js/mapmarker.js html/js/mappolygon.js html/js/mapshape.js html/js/options.js html/js/timebar.js html/js/timelevel.js html/js/timeline.js html/js/voyc.js >html/vc.js
cat html/jslib/animator.js html/jslib/card.js html/jslib/color.js html/jslib/cookie.js html/jslib/debug.js html/jslib/dragger.js html/jslib/event.js html/jslib/utils.js html/jslib/when.js html/jslib/xhr.js  >html/vlc.js
cat html/css/card.css html/css/dashboard.css html/css/detail.css html/css/layout.css html/css/mapcard.css html/css/timeline.css html/css/typography.css html/css/voyc.css >html/vc.css

# compress the concatenated js and css files
java -jar /home/jhagstrand/bin/yuicompressor/yuicompressor-2.4.2.jar html/vc.js -o html/vc.js --charset utf-8
java -jar /home/jhagstrand/bin/yuicompressor/yuicompressor-2.4.2.jar html/vlc.js -o html/vlc.js --charset utf-8
java -jar /home/jhagstrand/bin/yuicompressor/yuicompressor-2.4.2.jar html/vc.css -o html/vc.css --charset utf-8

# prepare index.php for production use
cp html/index.html html/index.php
sed -i -e 's/<!--<remove>//g' html/index.php
sed -i -e 's/<remove>-->//g' html/index.php

# generate js docs
#./voyc_jsdoc.sh

# generate php docs
#./voyc_phpdoc.sh
