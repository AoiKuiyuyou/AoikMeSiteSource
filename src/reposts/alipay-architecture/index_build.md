--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: Alipay architecture

author: Repost

create_time: 2019-12-06 20:00:00

tags:
    - alipay
    - architecture

post_id: 56

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Alipay architecture
[Link](https://mp.weixin.qq.com/s/RxjBtIO8GdshYyod1KWb1Q)
