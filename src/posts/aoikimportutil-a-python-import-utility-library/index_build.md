--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: AoikImportUtil a Python import utility library

author: Aoik

create_time: 2019-04-08 20:00:00

tags:
    - python

post_id: 28

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# AoikImportUtil a Python import utility library
Tested with Python 2.7, 3.7.

[AoikArgUtil](https://github.com/AoiKuiyuyou/AoikImportUtil-Python) is a utility library to import modules and objects.

## Import module by code
E.g.
```
import sys

from aoikimportutil import import_code

mod_obj = import_code(mod_name='a', mod_code='x = 1')

assert mod_obj is sys.modules['a']

assert mod_obj.x == 1
```

## Import module by name
E.g.
```
import sys

from aoikimportutil import import_name

mod_obj = import_name('os.path')

assert mod_obj is sys.modules['os.path']
```

## Import module by path
E.g.
```
import sys

from aoikimportutil import import_path

mod_obj = import_path('src/aoikimportutil/aoikimportutil.py', mod_name='a')

assert mod_obj is sys.modules['a']
```

## Import object
E.g.
```
import sys

from aoikimportutil import import_obj

mod_obj = import_obj('os.path')

assert mod_obj is sys.modules['os.path']

func_obj = import_obj('os.path::split')

assert func_obj is sys.modules['os.path'].split

class_obj = import_obj('os.path::split.__class__')

assert class_obj is sys.modules['os.path'].split.__class__

import_code = import_obj('src/aoikimportutil/aoikimportutil.py::import_code', mod_name='a')

assert import_code is sys.modules['a'].import_code
```
