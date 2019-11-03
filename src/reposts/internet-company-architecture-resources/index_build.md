--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: '各大互联网公司架构演进之路'

author: Repost

create_time: 2019-04-04 20:00:00

tags:
    - architecture

post_id: 24

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# 各大互联网公司架构演进之路
[《各大互联网公司架构演进之路》](https://mp.weixin.qq.com/s/QVzeiTKRHbddcSpEbeRK-g)
