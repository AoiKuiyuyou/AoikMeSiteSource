//
'use strict';

var assert = require('assert');

var moment = require('moment');

var config = require('../../config');

var project_dir = config.PROJECT_DIR;

assert(project_dir);

var pretty_json = require(project_dir + '/tools/util/jsonutil').pretty_json;

assert(pretty_json);

var SITE_ROOT = config.SITE_ROOT;


function base_context_factory() {
	const base_context = {
		jquery_js_url: SITE_ROOT + 'libs_outer/jquery/3.3.1/jquery.min.js',
		vue_js_url: SITE_ROOT + 'libs_outer/vue/2.5.16/vue.min.js',
		bootstrap_css_url: SITE_ROOT +
			'libs_outer/bootstrap/4.0.0/css/bootstrap.min.css',
		github_markdown_css_url: SITE_ROOT +
			'libs_outer/github-markdown-css/2.10.0/github-markdown.css',
		toastr_css_url: SITE_ROOT + 'libs_outer/toastr/2.1.3/toastr.min.css',
		toastr_js_url: SITE_ROOT + 'libs_outer/toastr/2.1.3/toastr.min.js',
		highlight_css_url: SITE_ROOT +
			'libs_outer/highlight/9.12.0/highlight.min.css',
		highlight_js_url: SITE_ROOT +
			'libs_outer/highlight/9.12.0/highlight.min.js',
		base_css_url: SITE_ROOT + 'libs_inner/base/base.css',
		post_js_url: SITE_ROOT + 'libs_inner/base/post.js',
		jquery_svg3dtagcloud_js_url: SITE_ROOT + 'libs_outer/jquery-svg3dtagcloud/jquery.svg3dtagcloud.min.js',
		nav_current_v_posts: 'posts',
		nav_current_v_reposts: 'reposts',
		nav_current_v_tags: 'tags',
		site_root_url: config.SITE_ROOT_URL,
		aoik_github_url: '' +
			'https://github.com/AoiKuiyuyou/Aoik/blob/master/README.md',
		aoik_resume_url: 'http://aoikuiyuyou.github.io/me.html',
		post_date_format: 'YYYY.MM.DD',
		posts_url: SITE_ROOT + 'posts',
		reposts_url: SITE_ROOT + 'reposts',
		post_meta_to_url: function (post_meta) {
			const dir_name = post_meta.dir_name;

			assert(dir_name);

			var path_seg = post_meta.$$is_repost ? 'reposts/' : 'posts/';

			var url = SITE_ROOT + path_seg + dir_name;

			return url;
		},
		tags_url: SITE_ROOT + 'tags',
		tags_tag_url: function (tag) {
			if (!tag) {
				tag = 'other';
			}
			return SITE_ROOT + 'tags/' + tag;
		},
		is_nan: isNaN,
		str: pretty_json,
		moment,
		config,
		parseInt,
		'': ''
	};

	return base_context;
}


module.exports = {
	base_context_factory
};
