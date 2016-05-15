<?php
require_once(dirname(__FILE__).'/../phplib/jlog.php');
openjlog( basename(__FILE__));
jlog(JLOG_DEBUG, 'I love my life. DEBUG');
jlog(JLOG_NOTICE, 'I love my life. NOTICE');
jlog(JLOG_WARN, 'I love my life. WARN');
?>
