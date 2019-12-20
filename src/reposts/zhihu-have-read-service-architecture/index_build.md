--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: Zhihu have-read service architecture

author: Repost

create_time: 2019-12-20 21:10:00

tags:
    - zhihu
    - architecture

post_id: 61

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Zhihu have-read service architecture
[Link](https://mp.weixin.qq.com/s/JbFSrekTddqza2nVlKHP6w)
