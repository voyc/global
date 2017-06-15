## database access depends on ~/.pgpass
pg_dump -Fp -b -U jhagstrand_voyc -n public -f /home/jhagstrand/db_backups/public-backup.`date +%Y%m%d`.`date +%H%M%S`.sql jhagstrand_voyc
pg_dump -Fp -b -U jhagstrand_voyc -n voyc -f /home/jhagstrand/db_backups/voyc-backup.`date +%Y%m%d`.`date +%H%M%S`.sql jhagstrand_voyc
pg_dump -Fp -b -U jhagstrand_voyc -n fpd -f /home/jhagstrand/db_backups/fpd-backup.`date +%Y%m%d`.`date +%H%M%S`.sql jhagstrand_voyc
psql -U jhagstrand_voyc -d jhagstrand_voyc -c 'select id, astext(the_geom) from fpd.fpd' >/home/jhagstrand/db_backups/fpd-geom.`date +%Y%m%d`.`date +%H%M%S`.sql

## backup source code
##zip -r -q /home/jhagstrand/code_backups/voyc-code-backup.`date +%Y%m%d`.`date +%H%M%S`.zip /home/jhagstrand/webapps/voyc/* 
