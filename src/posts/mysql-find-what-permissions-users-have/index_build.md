--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: MySQL find what permissions users have

author: Aoik

create_time: 2019-03-24 20:00:00

tags:
    - mysql

post_id: 16

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# MySQL find what permissions users have
Tested with MySQL 5.7.22.

\
Run as root user:
```
SELECT *
FROM (
    # Global permissions
    SELECT
        user,
        host,
        '*' AS `database`,
        '*' AS `table`,
        '*' AS `column`,
        IF(select_priv='Y', '*.*.*', '') AS 'SELECT',
        IF(insert_priv='Y', '*.*.*', '') AS 'INSERT',
        IF(update_priv='Y', '*.*.*', '') AS 'UPDATE',
        IF(delete_priv='Y', '*.*.*', '') AS 'DELETE',
        IF(create_priv='Y', '*.*.*', '') AS 'CREATE',
        IF(drop_priv='Y', '*.*.*', '') AS 'DROP',
        IF(index_priv='Y', '*.*.*', '') AS 'INDEX',
        IF(alter_priv='Y', '*.*.*', '') AS 'ALTER'
    FROM mysql.user
    UNION
    # Database permissions
    SELECT
        user,
        host,
        db AS `database`,
        '*' AS `table`,
        '*' AS `column`,
        IF(select_priv='Y', CONCAT(db, '.*.*'), ''),
        IF(insert_priv='Y', CONCAT(db, '.*.*'), ''),
        IF(update_priv='Y', CONCAT(db, '.*.*'), ''),
        IF(delete_priv='Y', CONCAT(db, '.*.*'), ''),
        IF(create_priv='Y', CONCAT(db, '.*.*'), ''),
        IF(drop_priv='Y', CONCAT(db, '.*.*'), ''),
        IF(index_priv='Y', CONCAT(db, '.*.*'), ''),
        IF(alter_priv='Y', CONCAT(db, '.*.*'), '')
    FROM mysql.db
    UNION
    # Table permissions
    SELECT
        user,
        host,
        db AS `database`,
        table_name AS `table`,
        '*' AS `column`,
        IF(table_priv & 1, CONCAT(db, '.', table_name, '.*'), ''),
        IF(table_priv & 2, CONCAT(db, '.', table_name, '.*'), ''),
        IF(table_priv & 4, CONCAT(db, '.', table_name, '.*'), ''),
        IF(table_priv & 8, CONCAT(db, '.', table_name, '.*'), ''),
        IF(table_priv & 16, CONCAT(db, '.', table_name, '.*'), ''),
        IF(table_priv & 32, CONCAT(db, '.', table_name, '.*'), ''),
        IF(table_priv & 256, CONCAT(db, '.', table_name, '.*'), ''),
        IF(table_priv & 512, CONCAT(db, '.', table_name, '.*'), '')
    FROM mysql.tables_priv
    UNION
    # Column permissions
    SELECT
        user,
        host,
        db AS `database`,
        table_name AS `table`,
        column_name AS `column`,
        IF(LOCATE(column_priv, 'Select') >= 0, CONCAT(db, '.', table_name, '.', column_name), ''),
        IF(LOCATE(column_priv, 'Insert') >= 0, CONCAT(db, '.', table_name, '.', column_name), ''),
        IF(LOCATE(column_priv, 'Update') >= 0, CONCAT(db, '.', table_name, '.', column_name), ''),
        '',
        '',
        '',
        '',
        ''
    FROM mysql.columns_priv
) AS t1
ORDER BY t1.`user`, t1.`host`, t1.`database`, t1.`table`, t1.`column`;
```
