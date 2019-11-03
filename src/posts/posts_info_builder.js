//
'use strict';

var assert = require('assert');
var fs = require('fs');
var glob = require('glob');
var path = require('path');
var moment = require('moment');


function builder(options) {
	var msg;

	if (!(typeof options.config === 'object' && options.config)) {
		msg = 'Option `config` is not dict: ' + options.config;

		throw Error(msg);
	}

	if (!(typeof options.log === 'function')) {
		msg = 'Option `log` is not function: ' + options.log;

		throw Error(msg);
	}

	if (!(typeof options.require === 'function')) {
		msg = 'Option `require` is not function: ' + options.require;

		throw Error(msg);
	}

	if (!(typeof options.resolve === 'function')) {
		msg = 'Option `resolve` is not function: ' + options.resolve;

		throw Error(msg);
	}

	var config = options.config;

	var metadata_builder = config.load(config.METADATA_BUILDER_URI);

	assert(metadata_builder);

	var meta = options.meta;

	assert(meta);

	var post_glob = meta.post_glob;

	assert(post_glob);

	post_glob = options.resolve({
		uri: post_glob
	});

	var post_meta_file_paths = glob.sync(post_glob);

	var map_post_number_to_post_meta = {};

	var max_post_id = 0;

	post_meta_file_paths.forEach(function (file_path) {
		var file_data = fs.readFileSync(file_path, {
			encoding: 'utf8'
		});

		var post_meta = metadata_builder({
			uri: file_path,
			data: file_data,
			config: options.config,
			log: options.log,
			require: options.require,
			ignore_body: true
		});

		if (post_meta.$ignore_in_posts_and_tags) {
			return;
		}

		post_meta.dir_name = path.basename(path.dirname(
			file_path));

		post_meta.create_moment = moment(
			post_meta.create_time, 'YYYY-MM-DD HH:mm:ss');

		var post_id_num = parseInt(post_meta.post_id);

		if (post_id_num > max_post_id) {
			max_post_id = post_id_num;
		}

		map_post_number_to_post_meta[post_meta.post_id] = post_meta;
	});

	map_post_number_to_post_meta.max_post_id = max_post_id;

	options.config.custom.MAP_POST_NUMBER_TO_POST_META = map_post_number_to_post_meta;

	const buildInfo = {
		'max_post_id': max_post_id,
	}

	const buildInfoJson = JSON.stringify(buildInfo);

	fs.writeFileSync(
		meta.$$file_dir + '/posts_info_builder_info.json',
		buildInfoJson,
	);
}


module.exports = builder;
