--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Web API handles arguments elegantly

author: Aoik

create_time: 2019-01-03 19:30:00

tags:
    - web-api
    - flask

post_id: 9

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Web API handles arguments elegantly
Suppose we need to implement a web API that takes a "value" argument which should be an integer greater than zero, and echoes the value in response.

For an invalid "value" argument like
```
http://127.0.0.1/api/echo
http://127.0.0.1/api/echo?value=a
http://127.0.0.1/api/echo?value=0
http://127.0.0.1/api/echo?value=-1
```
, it returns
```
{
  "status": 400,
  "code": "ARG_ERR", 
  "code2": "value"
}
```

For a valid "value" argument like
```
http://127.0.0.1/api/echo?value=1
```
, it returns
```
{
  "status": 200,
  "code": "SUCCESS", 
  "value": 1
}
```

Use Python Flask web framework for example. Below is the primitive way doing it. As we can see, quite a lot boilerplate code is used to handle the argument.
```
@FLASK_APP.route('/api/echo', methods=['GET'])
def api_echo():
    try:
        value_text = request.args.get('value')

        if value_text is None:
            raise ValueError(value_text)

        value = int(value_text)

        if value <= 0:
            raise ValueError(value_text)
    except ValueError:
        resp = jsonify({
            'status': 400,
            'code': 'ARG_ERR',
            'code2': 'value',
        })

        resp.status_code = 400

        return resp

    resp = jsonify({
        'status': 200,
        'code': 'SUCCESS',
        'value': value,
    })

    return resp
```

We can improve the code by using a type function "int_gt_zero". This is better but the response returning for an invalid argument value is still quite a lot boilerplate code.
```
def int_gt_zero(value_text):
    if value_text is None:
        raise ValueError(value_text)

    value = int(value_text)

    if value <= 0:
        raise ValueError(value_text)

    return value


@FLASK_APP.route('/api/echo', methods=['GET'])
def api_echo():
    value = request.args.get('value', type=int_gt_zero)

    if value is None:
        resp = jsonify({
            'status': 400,
            'code': 'ARG_ERR',
            'code2': 'value',
        })

        resp.status_code = 400

        return resp

    resp = jsonify({
        'status': 200,
        'code': 'SUCCESS',
        'value': value,
    })

    return resp
```

We can further improve the code by using a "get_arg" function. The response returning for an invalid argument value is automatically done for us.
```
def int_gt_zero(value_text):
    if value_text is None:
        raise ValueError(value_text)

    value = int(value_text)

    if value <= 0:
        raise ValueError(value_text)

    return value


@FLASK_APP.route('/api/echo', methods=['GET'])
def api_echo():
    value = get_arg('value', type=int_gt_zero)

    resp = jsonify({
        'status': 200,
        'code': 'SUCCESS',
        'value': value,
    })

    return resp
```

How the "get_arg" function achieves this? Below is the full code:
```
# coding: utf-8
from __future__ import absolute_import

import sys

from flask import abort
from flask import Flask
from flask import jsonify
from flask import request


FLASK_APP = Flask(__name__)

_NO_DEFAULT = object()


def get_arg(name, type=None, default=_NO_DEFAULT):
    try:
        value = request.args.get(name, type=type, default=default)
    except Exception:
        abort(400, name)

    if value is not default:
        return value
    else:
        if default is not _NO_DEFAULT:
            return default
        else:
            abort(400, name)


def int_gt_zero(value_text):
    if value_text is None:
        raise ValueError(value_text)

    value = int(value_text)

    if value <= 0:
        raise ValueError(value_text)

    return value


@FLASK_APP.errorhandler(400)
def handle_error_400(exc):
    resp_dict = {
        'status': 400,
        'code': 'ARG_ERR',
    }

    desc = exc.description

    if desc is None:
        pass
    elif isinstance(desc, str):
        resp_dict['code2'] = desc
    elif isinstance(desc, dict):
        resp_dict.update(desc)
    else:
        raise TypeError(desc)

    resp = jsonify(resp_dict)

    resp.status_code = 400

    return resp


@FLASK_APP.route('/api/echo', methods=['GET'])
def api_echo():
    value = get_arg('value', type=int_gt_zero)

    resp = jsonify({
        'status': 200,
        'code': 'SUCCESS',
        'value': value,
    })

    return resp


def main(args=None):
    try:
        FLASK_APP.run(
            host='127.0.0.1',
            port=80,
            debug=True,
        )
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    sys.exit(main())
```
