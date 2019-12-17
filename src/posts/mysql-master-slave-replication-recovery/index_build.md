--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: MySQL master-slave replication recovery

author: Aoik

create_time: 2019-12-08 20:00:00

tags:
    - mysql
    - mysql-replication

post_id: 57

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# MySQL master-slave replication recovery
MySQL master-slave replication stopped on slave due to an error.

Run on slave DB:
```
SHOW SLAVE STATUS;
```

Result:
```
Slave_IO_Running: Yes

Slave_SQL_Running: No

Last_SQL_Errno: 1594

Last_SQL_Error: Relay log read failure: Could not parse relay log event entry...

Relay_Log_File: _RELAY_LOG_FILE_

Relay_Master_Log_File: _RELAY_MASTER_LOG_FILE_

Exec_Master_Log_Pos: _EXEC_MASTER_LOG_POS_
```

The error may be caused by either a corrupted master binlog file or relay
binlog file.

\
Run on master OS to check whether the master binlog file is corrupted:
```
mysqlbinlog /var/lib/mysql/_RELAY_MASTER_LOG_FILE_ > /dev/null
```

If the master binlog file is corrupted, the <a href="https://aoik.me/blog/posts/mysql-master-slave-replication-setup">replication setup</a> has to be done again.

\
Run on slave OS to check whether the relay binlog file is corrupted:
```
mysqlbinlog /var/lib/mysql/_RELAY_LOG_FILE_ > /dev/null
```

Result:
```
ERROR: Error in Log_event::read_log_event(): 'Event too small', data_len: 0, event_type: 0
ERROR: Could not read entry at offset 12345678: Error in log format or read error.
```

If the relay binlog file is corrupted, we can reset the relay binlog files.

Run on slave DB to reset the relay binlog files:
```
STOP SLAVE;
RESET SLAVE;
START SLAVE;
```

The slave will start replication from the next GTID.

\
Instead, if the error is not caused by a corrupted relay binlog file but an
offending transaction, we can skip that transaction. (Notice offending
transactions often indicate inconsistency between the master and slave's data.
Skipping them might not be sufficient to recover from the inconsistency.)

Run on master OS:
```
mysqlbinlog --start-position=_EXEC_MASTER_LOG_POS_ _RELAY_MASTER_LOG_FILE_ | less
```

In the result, find the `GTID_NEXT` of the transaction to be skipped:
```
SET @@SESSION.GTID_NEXT= '_GTID_NEXT_'
```

Run on slave DB to skip the transaction:
```
SET autocommit = 0;

SET GTID_NEXT= '_GTID_NEXT_';

BEGIN;

COMMIT;

SET GTID_NEXT='AUTOMATIC';

START SLAVE;
```

The slave will start replication after the skipped GTID.

\
**Resources:**  
[MySQL relay log corrupted, how do I fix it? Tried but failed](https://dba.stackexchange.com/questions/53893/mysql-relay-log-corrupted-how-do-i-fix-it-tried-but-failed)

[How To Skip a Transaction on MySQL replication slave When GTIDs Are Enabled](https://www.thegeekdiary.com/how-to-skip-a-transaction-on-mysql-replication-slave-when-gtids-are-enabled/)
