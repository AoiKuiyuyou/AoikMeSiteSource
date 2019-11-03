--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python class method closure

author: Aoik

create_time: 2019-10-29 20:00:00

tags:
    - python
    - closure

post_id: 50

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python class method closure
Python's class methods are functions nested in the class's block. Internally,
a class block is very similar to a function block, with the exception that nested
functions in it, i.e. the class methods, do not support accessing class
attributes as closure variables.
For example,
```
def f():
    v = 100
    def g():
        return v
    g()
```
works but
```
class f(object):
    v = 100
    def g():
        return v
    g()
```
fails with `NameError` for `v` because it is assumed to be a global variable.

Why the class attribute name `v` is out there but the class method `g` can not see it?

This is a design decision of Python and it is implemented at [here](https://github.com/python/cpython/blob/v3.8.0/Python/symtable.c#L807), where names visible in current block are made visible to child blocks only if the current block is not a class block. So if it is a class block, class methods, i.e. child blocks, really can not see the class attribute name `v`, as a result `v` in the class method `g` is assumed to be a global variable instead.

We can hack Python's source code to implement class method closure. Several places need to be patched.

At [here](https://github.com/python/cpython/blob/v3.8.0/Python/symtable.c#L807), change
```
if (ste->ste_type != ClassBlock) {
```
to
```
if (TRUE) {
```

\
At [here](https://github.com/python/cpython/blob/v3.8.0/Python/symtable.c#L809), change
```
if (ste->ste_type == FunctionBlock) {
```
to
```
if (ste->ste_type == FunctionBlock || ste->ste_type == ClassBlock) {
```

\
At [here](https://github.com/python/cpython/blob/v3.8.0/Python/symtable.c#L828), change
```
else {
```
to
```
if (ste->ste_type == ClassBlock) {
```

\
At [here](https://github.com/python/cpython/blob/v3.8.0/Python/symtable.c#L864), change
```
if (ste->ste_type == FunctionBlock && !analyze_cells(scopes, newfree))
```
to
```
if ((ste->ste_type == FunctionBlock || ste->ste_type == ClassBlock) && !analyze_cells(scopes, newfree))
```

\
At [here](https://github.com/python/cpython/blob/v3.8.0/Python/symtable.c#L866), change
```
else if (ste->ste_type == ClassBlock && !drop_class_free(ste, newfree))
```
to
```
if (ste->ste_type == ClassBlock && !drop_class_free(ste, newfree))
```

\
At [here](https://github.com/python/cpython/blob/v3.8.0/Python/compile.c#L2317), change
```
assert(PyDict_GET_SIZE(c->u->u_cellvars) == 0);
```
to
```
//assert(PyDict_GET_SIZE(c->u->u_cellvars) == 0);
```

\
Now the code below works:
```
class Test(object):

    CLASS_FIELD = 100
    
    def get_class_field(self):
        return CLASS_FIELD
        
    def set_class_field(self, value):
        nonlocal CLASS_FIELD
        CLASS_FIELD = value


test = Test()

assert test.get_class_field() == 100

test.set_class_field(200)
assert test.get_class_field() == 200
```

\
Notice a subtlety here that with class attributes accessed as closure variables in class methods, change of a class attribute's value via attribute assignment will not be perceived by the class methods because they are bound to access the closure variable, instead of doing an attribute lookup on the class object to get the new value. For example:
```
class Test(object):

    CLASS_FIELD = 100
    
    def get_class_field(self):
        return CLASS_FIELD
        
    def set_class_field(self, value):
        nonlocal CLASS_FIELD
        CLASS_FIELD = value


test = Test()

Test.CLASS_FIELD = 200
assert test.get_class_field() == 100

test.set_class_field(300)
assert test.get_class_field() == 300
assert Test.CLASS_FIELD == 200
```
