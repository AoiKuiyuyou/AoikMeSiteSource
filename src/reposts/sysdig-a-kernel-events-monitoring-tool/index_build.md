--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: Sysdig a kernel events monitoring tool

author: Repost

create_time: 2019-04-02 20:00:00

tags:
    - sysdig
    - monitoring

post_id: 22

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Sysdig a kernel events monitoring tool
Sysdig uses a kernel module to monitor kernel events like system calls. These events can be filtered, logged, analyzed to provide a very internal perspective of the monitored system.

[Github](https://github.com/draios/sysdig)

[Wiki](https://github.com/draios/sysdig/wiki)

[Examples](https://github.com/draios/sysdig/wiki/Sysdig-Examples)

[Analyze the process of hacker intrusion](https://sysdig.com/blog/fishing-for-hackers/)
