--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: '为什么Windows/iOS操作很流畅而Linux/Android却很卡顿呢'

author: Repost

create_time: 2019-10-26 19:00:00

tags:
    - operating-system-study
    - windows
    - linux
    - ios
    - android

post_id: 48

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# 为什么Windows/iOS操作很流畅而Linux/Android却很卡顿呢
[Link1 (Origin)](https://blog.csdn.net/dog250/article/details/96362789), [Link2 (WeChat)](https://mp.weixin.qq.com/s/2tkBhW8btWknRjlQ6o-azw)
