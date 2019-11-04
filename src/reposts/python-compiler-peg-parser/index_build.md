--- yaml | extend://meta://root://src/reposts/_base/repost_page_base_build.md

title: "Python's compiler - PEG parser"

author: Repost

create_time: 2019-11-04 22:00:00

tags:
    - python
    - compiler
    - parser
    - parser-generator

post_id: 53

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python's compiler - PEG parser
[PEG Parsing Series Overview](https://medium.com/@gvanrossum_83706/peg-parsing-series-de5d41b2ed60)
