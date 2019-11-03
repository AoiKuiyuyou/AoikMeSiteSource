--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python convert between bytes and hex octal representation

author: Aoik

create_time: 2019-07-18 22:00:00

tags:
    - python

post_id: 32

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python convert between bytes and hex octal representation

## Convert between bytes and hex
```
import binascii
import codecs

# Bytes to hex bytes
assert binascii.hexlify(b'\xff\xff') == b'ffff'
# Hex bytes to bytes
assert binascii.unhexlify(b'ffff') == b'\xff\xff'

# Bytes to hex bytes
assert codecs.encode(b'\xff\xff', 'hex') == b'ffff'
# Hex bytes to bytes
assert codecs.decode(b'ffff', 'hex') == b'\xff\xff'

# Bytes to hex escape bytes
assert b'\xff\xff'.decode('latin1').encode('unicode_escape') == br'\xff\xff'
# Hex escape bytes to bytes
assert br'\xff\xff'.decode('unicode_escape').encode('latin1') == b'\xff\xff'
```

## Convert between bytes and octal
```
def bytes_to_octal(bytes_obj):
    byte_octals = []
    for byte in bytes_obj:
        byte_octal = oct(byte)[2:]
        byte_octals.append(byte_octal)
    return ''.join(byte_octals)

def octal_to_bytes(bytes_octal):
    _bytes = []
    for i in range(0, len(bytes_octal), 3):
        byte_octal = bytes_octal[i:i+3]
        byte = int(byte_octal, 8)
        _bytes.append(byte)
    return bytes(_bytes)

def bytes_to_octal_escape(bytes_obj):
    byte_texts = []
    for byte in bytes_obj:
        byte_octal = oct(byte)[2:]
        byte_text = '\\' + byte_octal
        byte_texts.append(byte_text)
    return ''.join(byte_texts)

def octal_escape_to_bytes(octal_escape):
    _bytes = []
    for i in range(0, len(octal_escape), 4):
        byte_octal = octal_escape[i+1:i+4]
        byte = int(byte_octal, 8)
        _bytes.append(byte)
    return bytes(_bytes)

assert octal_to_bytes('377377') == b'\377\377'
assert bytes_to_octal(b'\377\377') == '377377'

assert bytes_to_octal_escape(b'\377\377') == r'\377\377'
assert octal_escape_to_bytes(r'\377\377') == b'\377\377'
```
