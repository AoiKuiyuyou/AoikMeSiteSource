--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: MySQL master-slave replication setup

author: Aoik

create_time: 2019-04-03 19:00:00

tags:
    - mysql

post_id: 23

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# MySQL master-slave replication setup
Tested with MySQL 5.7.22.

\
On master host, create directory for storing MySQL binary log:
```
mkdir -pv /var/lib/mysql_bin_log

chown mysql:mysql /var/lib/mysql_bin_log
```

\
On master host, edit master MySQL server's config to enable binary log:
```
server_id=1
log_bin=/var/lib/mysql_bin_log/bin_log
log_bin_index=/var/lib/mysql_bin_log/bin_log.index
binlog_format=row
max_binlog_size=100M
gtid_mode=on
enforce-gtid-consistency=on
log-slave-updates=1
expire_logs_days=10
```

\
On master host, restart master MySQL server:
```
systemctl restart mysqld
```

\
On master host, verify binary log files have been created:
```
ls -l /var/lib/mysql_bin_log
```

\
Log in to master MySQL server, create user for replication:
```
CREATE USER 'dbsync'@'%' IDENTIFIED BY '_DBSYNC_PASSWORD_';

GRANT REPLICATION SLAVE ON *.* TO 'dbsync'@'%';
```

\
On slave host, edit slave MySQL server's config file to disable binary log by commenting out the following lines:
```
#server_id=2
#log_bin=/var/lib/mysql_bin_log/bin_log
#log_bin_index=/var/lib/mysql_bin_log/bin_log.index
#binlog_format=row
#max_binlog_size=100M
#gtid_mode=on
#enforce-gtid-consistency=on
#log-slave-updates=1
#expire_logs_days=10
```
This aims to not generate binary log during loading dump data from master MySQL server.

\
On slave host, restart slave MySQL server:
```
systemctl restart mysqld
```

\
On slave host, dump data from master MySQL server:
```
mysqldump -h _MASTER_DB_HOST_ -P _MASTER_DB_PORT_ -u _MASTER_DB_USERNAME_ -p --default-character-set=utf8mb4 --single-transaction --quick --hex-blob --extended-insert=true --max_allowed_packet=10M --set-gtid-purged=ON > mysqldump_data.sql 2> mysqldump_log.txt
```
The program will prompt for password.

\
Log in to slave MySQL server, clear binary log:
```
RESET MASTER
```
This will clear global variable `GTID_PURGED` so that the statement in `mysqldump_data.sql` that sets `GTID_PURGED` will not fail.

\
On slave host, load data into slave MySQL server:
```
(echo "SET autocommit = 0;"; cat mysqldump_data.sql; echo "COMMIT;" ) | mysql -h _SLAVE_DB_HOST_ -P _SLAVE_DB_PORT_ -u _SLAVE_DB_USERNAME_ -p > mysql_log.txt 2>&1
```
The program will prompt for password.

\
On slave host, create directory for storing MySQL binary log:
```
mkdir -pv /var/lib/mysql_bin_log

chown mysql:mysql /var/lib/mysql_bin_log
```

\
On slave host, edit slave MySQL server's config to enable binary log:
```
server_id=2
log_bin=/var/lib/mysql_bin_log/bin_log
log_bin_index=/var/lib/mysql_bin_log/bin_log.index
binlog_format=row
max_binlog_size=100M
gtid_mode=on
enforce-gtid-consistency=on
log-slave-updates=1
expire_logs_days=10
```

\
On slave host, restart slave MySQL server:
```
systemctl restart mysqld
```

\
On slave host, verify binary log files have been created:
```
ls -l /var/lib/mysql_bin_log
```

\
On slave host, find the `GTID_PURGED` value in `mysqldump_data.sql`:
```
head -n 50 mysqldump_data.sql | grep GTID_PURGED
```

\
Log in to slave MySQL server, find the value of global variable `GTID_PURGED`:
```
SELECT @@GLOBAL.GTID_PURGED
```
Verify the value matches with that in `mysqldump_data.sql`.

\
Log in to slave MySQL server, enable replication:
```
CHANGE MASTER TO MASTER_HOST="_MASTER_DB_HOST_", MASTER_PORT="_MASTER_DB_PORT_", MASTER_USER="dbsync", MASTER_PASSWORD="_DBSYNC_PASSWORD_", MASTER_AUTO_POSITION = 1;

START SLAVE;
```

\
Check replication status:
```
SHOW SLAVE STATUS;
```
