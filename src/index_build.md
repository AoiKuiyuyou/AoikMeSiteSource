--- yaml | ss

nav_current: home

breadcrumbs:
  - Home|/blog
  
tags_info: ss://load://./tags/tags_info.json

$template:
  file: ./index_template.html
  
  builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release
  
--- template | output
