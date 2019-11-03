--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: '图文并茂VLAN详解，让你看一遍就理解VLAN'

author: Repost

create_time: 2019-04-01 21:00:00

tags:
    - vlan

post_id: 21

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# 图文并茂VLAN详解，让你看一遍就理解VLAN
[《图文并茂VLAN详解，让你看一遍就理解VLAN》](https://blog.51cto.com/6930123/2115373)
