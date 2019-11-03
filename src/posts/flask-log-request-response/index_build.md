--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Flask log request response

author: Aoik

create_time: 2019-04-09 21:00:00

tags:
    - python
    - flask

post_id: 29

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Flask log request response
Tested with Python 2.7, 3.7.

\
Create **FlaskLogRequestResponseDemo.py**:
```
# coding: utf-8
from __future__ import absolute_import

from datetime import datetime
from flask import Flask
from flask import jsonify
from flask import request
import json
import logging
try:
    from io import BytesIO
except ImportError:
    from StringIO import StringIO as BytesIO


LOGGER = logging.getLogger(__name__)


FLASK_APP = Flask(__name__)


class SaveBodyWsgiApp(object):

    def __init__(self, app):
        self.app = app

    def __call__(self, environ, start_response):
        content_length = environ.get('CONTENT_LENGTH', '0')

        content_length = 0 if not content_length else int(content_length)

        body = environ['wsgi.input'].read(content_length)

        environ['raw_body'] = body

        environ['wsgi.input'] = BytesIO(body)

        resp = self.app(
            environ,
            start_response,
        )

        return resp


@FLASK_APP.before_request
def before_request():
    if not FLASK_APP.debug:
        return

    lines = []

    time_now = datetime.now()

    lines.append('Time: ' + time_now.strftime('%Y-%m-%d %H:%M:%S'))

    lines.append('Remote IP: ' + request.remote_addr)

    lines.append('Protocol: ' + str(request.scheme))

    lines.append('Method: ' + request.method)

    lines.append('Host: ' + request.host)

    lines.append('URL: ' + request.url)

    lines.append('Path: ' + request.path)

    lines.append('Query: ' + repr(request.query_string))

    header_texts = [
        '{0}: {1}'.format(repr(x[0]), repr(x[1]))\
        for x in request.headers
    ]

    lines.append('Headers:\n```\n{0}\n```'.format('\n'.join(header_texts)))

    lines.append('Query arguments:')

    query_arguments = dict(request.args)

    lines.append(
        json.dumps(
            query_arguments, ensure_ascii=False, indent=4, sort_keys=True,
        )
    )

    lines.append('Body arguments:')

    body_arguments = dict(request.form)

    lines.append(
        json.dumps(
            body_arguments, ensure_ascii=False, indent=4, sort_keys=True,
        )
    )

    body_data = request.environ.get('raw_body')

    if body_data is None:
        body_data = request.get_data()

    lines.append('Body: {0}'.format(repr(body_data)))

    if body_data:
        content_type = request.headers.get('Content-Type')

        if content_type == 'application/json':
            try:
                body_dict = json.loads(request.data.decode('utf-8'))

                body_text = json.dumps(
                    body_dict, ensure_ascii=False, indent=4, sort_keys=True,
                )

                lines.append('Body dict:\n{0}'.format(body_text))
            except Exception:
                pass

    message = '\n# ----- Request -----\n{0}\n'.format(
        '\n'.join(lines),
    )

    LOGGER.debug(message)


@FLASK_APP.after_request
def after_request(response):
    if not FLASK_APP.debug:
        return response

    lines = []

    time_now = datetime.now()

    lines.append('Time: ' + time_now.strftime('%Y-%m-%d %H:%M:%S'))

    lines.append('Status: {0}'.format(response.status))

    header_texts = [
        '{0}: {1}'.format(repr(x[0]), repr(x[1]))\
        for x in response.headers
    ]

    lines.append('Headers:\n```\n{0}\n```'.format('\n'.join(header_texts)))

    try:
        body = response.get_data()
    except Exception:
        body = None

    lines.append('Body: {0}'.format(repr(body)))

    content_type = response.headers.get('Content-Type')

    if content_type == 'application/json':
        try:
            body_dict = json.loads(body)

            body_text = json.dumps(
                body_dict, ensure_ascii=False, indent=4, sort_keys=True,
            )

            lines.append('Body dict:\n{0}'.format(body_text))
        except Exception:
            pass

    message = '\n# ----- Response -----\n{0}\n'.format(
        '\n'.join(lines),
    )

    LOGGER.debug(message)

    return response


@FLASK_APP.route('/api/test', methods=['GET', 'POST'])
def api_test():
    return jsonify({
        'status': 200,
        'code': 'SUCCESS',
    })


def main(args=None):
    try:
        log_formatter = logging.Formatter(
            '# %(asctime)s %(filename)s:L%(lineno)d %(levelname)s %(message)s'
        )

        log_handler = logging.StreamHandler()

        log_handler.setLevel(logging.DEBUG)

        log_handler.setFormatter(log_formatter)

        root_logger = logging.getLogger()

        root_logger.setLevel(logging.DEBUG)

        root_logger.addHandler(log_handler)

        debug = True

        if debug:
            FLASK_APP.wsgi_app = SaveBodyWsgiApp(FLASK_APP.wsgi_app)

        FLASK_APP.run(
            host='127.0.0.1',
            port=8000,
            debug=debug,
        )
    except KeyboardInterrupt:
        pass


if __name__ == '__main__':
    exit(main())
```

\
Run **FlaskLogRequestResponseDemo.py**:
```
python FlaskLogRequestResponseDemo.py
```

\
Send a request:
```
curl -v -X POST -H 'Content-Type: application/json' -d '{"x": 1,  "y": 2}' \
    'http://127.0.0.1:8000/api/test?a=1&b=2'
```

\
Log result:
````
# 2019-04-09 21:13:12,973 FlaskLogRequestResponseDemo.py:L124 DEBUG
# ----- Request -----
Time: 2019-04-09 21:13:12
Remote IP: 127.0.0.1
Protocol: http
Method: POST
Host: 127.0.0.1:8000
URL: http://127.0.0.1:8000/api/test?a=1&b=2
Path: /api/test
Query: b'a=1&b=2'
Headers:
```
'Host': '127.0.0.1:8000'
'User-Agent': 'curl/7.29.0'
'Accept': '*/*'
'Content-Type': 'application/json'
'Content-Length': '16'
```
Query arguments:
{
    "a": [
        "1"
    ],
    "b": [
        "2"
    ]
}
Body arguments:
{}
Body: b'{"x": 1, "y": 2}'
Body dict:
{
    "x": 1,
    "y": 2
}

# 2019-04-09 21:13:12,977 FlaskLogRequestResponseDemo.py:L172 DEBUG
# ----- Response -----
Time: 2019-04-09 21:13:12
Status: 200 OK
Headers:
```
'Content-Type': 'application/json'
'Content-Length': '42'
```
Body: b'{\n  "code": "SUCCESS", \n  "status": 200\n}\n'
Body dict:
{
    "code": "SUCCESS",
    "status": 200
}
````
