--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python private attribute

author: Aoik

create_time: 2019-08-24 20:00:00

tags:
    - python
    - closure

post_id: 42

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python private attribute
To access an attribute a class instance needs to keep a reference to the
attribute object. Because all attribute references are accessible via a class
instance's `__dict__`, it seems impossible to implement private attribute.
There is one way, however. The key is to put attribute references in a place
inaccessible outside the class, by using closure:
```
def create_class():
    private_attributes = dict()

    class Class(object):
        def __init__(self):
            private_attributes[id(self)] = 0

        def __del__(self):
            try:
                del private_attributes[id(self)]
            except KeyError:
                pass

        def get_private_attribute(self):
            return private_attributes[id(self)]

        def set_private_attribute(self, value):
            private_attributes[id(self)] = value

    return Class

Class = create_class()

obj = Class()

assert obj.get_private_attribute() == 0

obj.set_private_attribute(1)

assert obj.get_private_attribute() == 1
```
