#!/bin/sh
# build the php documentation

# I made two changes to the PhpDocumentor source code,
# as described here: http://pear.php.net/bugs/bug.php?id=9129&edit=3
#
# Common subdirectories: phpdoc_original/phpDocumentor/Converters and phpdoc_new/phpDocumentor/Converters 
# diff -ud phpdoc_original/phpDocumentor/Parser.inc phpdoc_new/phpDocumentor/Parser.inc 
# --- phpdoc_original/phpDocumentor/Parser.inc 2008-03-01 14:45:21.000000000 -0500 
# +++ phpdoc_new/phpDocumentor/Parser.inc 2008-03-01 14:38:42.000000000 -0500 
# @@ -556,6 +556,7 @@
#  $name = str_replace( ':', '', dirname($path) . PATH_DELIMITER . $page->getFile() );
#  $tmp = explode( PATH_DELIMITER, $name );
#  $name = implode( "---", array_slice( $tmp, $base ) ); 
# + $name = str_replace('.php','-dot-php',$name);
# 
#  // if base is '', drive letter is present in windows
#  $page->setName($name); 

# diff -ud phpdoc_original/phpDocumentor/phpDocumentorTParser.inc phpdoc_new/phpDocumentor/phpDocumentorTParser.inc 
# --- phpdoc_original/phpDocumentor/phpDocumentorTParser.inc 2008-03-01 14:45:15.000000000 -0500 
# +++ phpdoc_new/phpDocumentor/phpDocumentorTParser.inc 2008-03-01 14:41:42.000000000 -0500 
# @@ -251,6 +251,7 @@
#  . PATH_DELIMITER . $page->getFile());
#  $tmp = explode(PATH_DELIMITER, $name);\
#  $name = implode("---", array_slice($tmp, $base)); 

# + $name = str_replace('.php','-dot-php',$name);
# 
#  // if base is '', drive letter is present in windows 
#  $page->setName($name); 
# 
# Common subdirectories: phpdoc_original/phpDocumentor/Smarty-2.6.0 and phpdoc_new/phpDocumentor/Smarty-2

/home/jhagstrand/bin/PhpDocumentor/phpdoc -t /home/jhagstrand/webapps/voyc/html/docs/phpdoc -d /home/jhagstrand/webapps/voyc/phplib/,/home/jhagstrand/webapps/voyc/html/svc/,/home/jhagstrand/webapps/voyc/cli/
