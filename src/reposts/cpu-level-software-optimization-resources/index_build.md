--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: 'CPU level software optimization resources'

author: Repost

create_time: 2019-08-21 20:00:00

tags:
    - cpu
    - assembly

post_id: 38

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# CPU level software optimization resources
\
[CPU level software optimization resources](https://www.agner.org/optimize/)
