--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: 'Java GC resources'

author: Repost

create_time: 2019-10-31 23:00:00

tags:
    - java
    - jvm
    - gc

post_id: 51

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Java GC resources
[Java Garbage Collection 101](https://michalplachta.com/2014/04/27/java-garbage-collection-101/)

[Understanding Java Garbage Collection](https://www.cubrid.org/blog/understanding-java-garbage-collection)

[Understanding Java Garbage Collection And What You Can Do About It](https://www.azul.com/files/Understanding_Java_Garbage_Collection_v4.pdf)

[JVM performance optimization, Part 3: Garbage collection](https://www.javaworld.com/article/2078645/jvm-performance-optimization-part-3-garbage-collection.html)

[Java Platform, Standard Edition HotSpot Virtual Machine Garbage Collection Tuning Guide](https://docs.oracle.com/javase/10/gctuning/)

[Do It Yourself (OpenJDK) Garbage Collector](https://shipilev.net/jvm/diy-gc/)
