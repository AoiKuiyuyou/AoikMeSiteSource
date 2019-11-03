--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python C extension minimal example

author: Aoik

create_time: 2019-03-19 20:00:00

tags:
    - python

post_id: 11

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python C extension minimal example
Create file `myext.c`:
```
#include <Python.h>

PyObject * add(PyObject *self, PyObject *args) {
    long num1, num2;

    if(!PyArg_ParseTuple(args, "ll", &num1, &num2))
        return NULL;

    return PyLong_FromLong(num1 + num2);
}

PyMethodDef myext_method_defs[] = {
    {
        "add",
        (PyCFunction)add,
        METH_VARARGS,
        "Add two numbers."
    },
    {
        NULL
    }
};

PyModuleDef myext_module_def = {
    PyModuleDef_HEAD_INIT,
    "myext",
    "My extension.",
    -1,
    myext_method_defs,
    NULL,
    NULL,
    NULL,
    NULL
};

PyMODINIT_FUNC PyInit_myext(void) {
    return PyModule_Create(&myext_module_def);
}
```

Create file `setup.py`:
```
# coding: utf-8
from setuptools import Extension
from setuptools import setup

setup(
    name = 'myext',
    version = '0.0.1',
    ext_modules = [
        Extension('myext', ['myext.c'])
    ]
)
```

Create file `test.py`:
```
# coding: utf-8
import myext

c_add = myext.add

def py_add(a, b):
    return a + b

if __name__ == '__main__':
    from timeit import Timer

    number = 1000000

    timer = Timer('c_add(1, 2)', 'from __main__ import c_add')
    print(timer.timeit(number=number))

    timer = Timer('py_add(1, 2)', 'from __main__ import py_add')
    print(timer.timeit(number=number))
```

Compile the C extension:
```
python setup.py build
```

Copy the result `.pyd` file (`./build/lib.win-amd64-3.7/myext.cp37-win_amd64.pyd` for example) to current directory.

Run the test file:
```
python test.py
```

Tested working with Python 3.7.0.
