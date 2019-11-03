--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: MySQL find what statement is causing a lock

author: Aoik

create_time: 2019-03-23 20:00:00

tags:
    - mysql

post_id: 15

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# MySQL find what statement is causing a lock
Tested with MySQL 5.7.22.

\
Show open tables:
```
SHOW OPEN TABLES WHERE In_Use > 0;
```
This can reveal open tables due to lock waits.

\
Show processes information:
```
SHOW FULL PROCESSLIST;
```
This can reveal the lock waiting process's pending statement.

\
Show transactions information:
```
SHOW ENGINE INNODB STATUS;
```
The `TRANSACTIONS` section can reveal the lock waiting transaction's pending statement.

\
Show transactions information:
```
SELECT * FROM information_schema.innodb_trx;
```
This can reveal each transaction's information like `trx_id`, `trx_state` (e.g. `RUNNING`, `LOCK WAIT`), `trx_started` (time), `trx_wait_started` (time), `trx_mysql_thread_id` (PROCESSLIST ID, not thread ID), `trx_query`.

\
Show InnoDB lock waits:
```
SELECT * FROM sys.innodb_lock_waits;
```
This can reveal each lock waiting transaction (`waiting_trx_id`, `waiting_pid`) and its corresponding lock holding transaction (`blocking_trx_id`, `blocking_pid`).

\
Use the `blocking_pid` from `sys.innodb_lock_waits`, we can find the corresponding thread ID from `performance_schema.threads`. Then use the thread ID, we can find the last one and ten statements of the lock holding transaction from `performance_schema.events_statements_current` and `performance_schema.events_statements_history`:
```
SELECT
    t1.waiting_trx_id,
    t1.waiting_pid,
    t2.THREAD_ID AS waiting_tid,
    t1.wait_started,
    t1.wait_age,
    t1.waiting_query,
    t1.locked_table,
    t1.locked_index,
    t1.locked_type,
    t1.blocking_trx_id,
    t1.blocking_trx_started,
    t1.blocking_trx_age,
    t1.blocking_pid,
    t3.THREAD_ID AS blocking_tid,
    t1.blocking_query,
    t4.SQL_TEXT AS blocking_last_query,
    t5.SQL_TEXT AS blocking_last_10_querys
FROM sys.innodb_lock_waits AS t1
LEFT JOIN performance_schema.threads AS t2
ON t1.waiting_pid = t2.PROCESSLIST_ID
LEFT JOIN performance_schema.threads AS t3
ON t1.blocking_pid = t3.PROCESSLIST_ID
LEFT JOIN performance_schema.events_statements_current AS t4
ON t3.THREAD_ID = t4.THREAD_ID
LEFT JOIN performance_schema.events_statements_history AS t5
ON t3.THREAD_ID = t5.THREAD_ID
ORDER BY t1.waiting_trx_id, t1.blocking_trx_id, t5.EVENT_ID;
```
