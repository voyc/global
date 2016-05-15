## this is a comment
md=`date +%m%d%Y`;find ~/logs/user/*.log -exec mv {} {}.$md \;
