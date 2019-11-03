--- yaml | extend://call://root://tools/basecontext/metadata_base.js

title: Reposts

nav_current: reposts

breadcrumbs:
  - Home|/blog
  - Reposts|/blog/reposts

post_glob: root://src/reposts/*/index_build.md

$template:
  file: ./index_template.html
  
  builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- ./index_builder.js | template | output
