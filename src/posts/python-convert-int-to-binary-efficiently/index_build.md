--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python convert int to binary efficiently

author: Aoik

create_time: 2019-03-25 20:00:00

tags:
    - python
    - algorithm
    - source-code-study
    - 吸星大法强吃源码

post_id: 17

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python convert int to binary efficiently

Below are several ways to convert an int to binary string.
```
# coding: utf-8

def f1(num):
    if not num:
        return '0'
    bin_str = ''
    while num:
        bin_str = ('1' if (num & 1) else '0') + bin_str
        num >>= 1
    return bin_str

NUM_TO_BIN_0XFF = dict((i, bin(i)[2:]) for i in range(0xFF + 1))

def f2(num):
    if not num:
        return '0'
    bin_str = ''
    while num:
        bin_str = NUM_TO_BIN_0XFF[num & 0xFF] + bin_str
        num >>= 8
    return bin_str


NUM_TO_BIN_0XFFFF = dict((i, bin(i)[2:]) for i in range(0xFFFF + 1))

def f3(num):
    if not num:
        return '0'
    bin_str = ''
    while num:
        bin_str = NUM_TO_BIN_0XFFFF[num & 0xFFFF] + bin_str
        num >>= 16
    return bin_str


NUMS = list(range(0xFFFF + 1))


if __name__ == '__main__':
    from timeit import Timer

    number = 10

    timer = Timer('for i in NUMS: bin(i)', 'from __main__ import f1, NUMS')
    print(int(timer.timeit(number=number) / number / len(NUMS) * 1e9))

    timer = Timer('for i in NUMS: bin(i)[2:]', 'from __main__ import f1, NUMS')
    print(int(timer.timeit(number=number) / number / len(NUMS) * 1e9))

    timer = Timer('for i in NUMS: \'{0:b}\'.format(i)', 'from __main__ import f1, NUMS')
    print(int(timer.timeit(number=number) / number / len(NUMS) * 1e9))

    timer = Timer('for i in NUMS: f1(i)', 'from __main__ import f1, NUMS')
    print(int(timer.timeit(number=number) / number / len(NUMS) * 1e9))

    timer = Timer('for i in NUMS: f2(i)', 'from __main__ import f2, NUMS')
    print(int(timer.timeit(number=number) / number / len(NUMS) * 1e9))

    timer = Timer('for i in NUMS: f3(i)', 'from __main__ import f3, NUMS')
    print(int(timer.timeit(number=number) / number / len(NUMS) * 1e9))
```

`f1` checks the rightmost bit of the number and then right-shifts the number by one bit.

`f2` uses a pre-computed dict to map the rightmost byte of the number to binary string and then right-shifts the number by 8 bits.

`f3` uses a pre-computed dict to map the rightmost two bytes of the number to binary string and then right-shifts the number by 16 bits.

The benchmarking result on my computer is:
- `bin(i)[2:]`: 1.59x of `bin(i)`.
- `'{0:b}'.format(i)`: 2.36x of `bin(i)`.
- `f1(i)`: 25.36x of `bin(i)`.
- `f2(i)`: 4.42x of `bin(i)`.
- `f3(i)`: 2.86x of `bin(i)`.

We can see `bin` is the fastest. `f1` is very slow. The pre-computing approach of `f2` and `f3` makes their performance not an order of magnitude slower than the built-in `bin` function.

Now let's take a look of the source code of the built-in `bin` function to see why it is fast.

[Here](https://github.com/python/cpython/blob/v3.7.0/Python/bltinmodule.c#L483) is the definition of `bin`. It in turn calls [PyNumber_ToBase](https://github.com/python/cpython/blob/v3.7.0/Objects/abstract.c#L1478), which in turn calls [_PyLong_Format](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1939), which in turn calls [long_format_binary](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1777).

As shown [here](https://github.com/python/cpython/blob/v3.7.0/Include/longintrepr.h#L87), an int object is internally represented as an array of `digit` (i.e. `uint32_t`). Each `digit` stores 30 bits of the int. This explains the way the number of bits of an int is computed in `long_format_binary` at [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1824). Notice the last `digit`'s number of bits is computed using `bits_in_digit`, to exclude leading zeros.

At [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1845), a unicode object is created.

At [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1920), macro [WRITE_UNICODE_DIGITS](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1889) is called to write the unicode object's internal data. At [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1894), a pointer to the internal data is obtained. Notice the `+ sz` part, it means to write the internal data from end to start.

At [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1896), macro [WRITE_DIGITS](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1851) is called.

At [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1862), each `digit`'s bits are put in `accum`. The `<< accumbits` part puts the bits in higher location in case there are some leftover bits from the previous `digit`. Leftover bits may appear because at [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1867) `bits` bits are handled each time and at [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1872) if there are less than `bits` in `accum`, the do-while loop will stop (unless it is handling the last `digit`), the next `digit`'s bits will be added to `accum`. The value of `bits` is 1 for base 2, 3 for base 8, and 4 for base 16. So for base 2, leftover bits will not appear.

At [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1868), the `bits` bits are mapped to the corresponding digit of the target base.

At [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1869), the digit is written to the unicode internal data.

At [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1870), the number of bits in `accum` is reduced.

At [here](https://github.com/python/cpython/blob/v3.7.0/Objects/longobject.c#L1871), `accum` is right-shifted to discard the bits already handled.

That's how the built-in `bin` function implements the int-to-binary conversion. In summary, it is fast because:
- 1\. It is implemented in C.
- 2\. It can access the internal bits of an int object. The mapping from each group of bits to a digit of the target base is implemented by a simple `char` offset.
- 3\. The digits of the target base are directly written to the unicode object's internal data.
