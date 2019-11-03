--- yaml

post_glob: root://src/@(posts|reposts)/*/index_build.md

$output: ./tags_info.json

--- ./tags_info_builder.js | output
