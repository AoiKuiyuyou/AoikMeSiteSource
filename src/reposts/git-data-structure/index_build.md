--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: 'Git data structure'

author: Repost

create_time: 2019-03-02 22:00:00

tags:
    - git
    - data-structure

post_id: 10

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Git data structure
[Understanding Git - Data Model](https://hackernoon.com/https-medium-com-zspajich-understanding-git-data-model-95eb16cc99f5)

[Understanding Git - Branching](https://hackernoon.com/understanding-git-branching-2662f5882f9)

[Understanding Git -Index](https://hackernoon.com/understanding-git-index-4821a0765cf)
