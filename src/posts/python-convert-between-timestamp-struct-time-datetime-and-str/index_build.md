--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python convert between timestamp, struct_time, datetime and str

author: Aoik

create_time: 2018-11-10 20:00:00

tags:
    - python
    - datetime

post_id: 3

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python convert between timestamp, struct_time, datetime and str
Code:
```
import calendar
from datetime import datetime
from datetime import timezone
import time


def get_now_timestamp():
    return time.time()

def get_now_utc_struct_time():
    return time.gmtime()

def get_now_local_struct_time():
    return time.localtime()

def get_now_utc_datetime():
    return datetime.utcnow()

def get_now_local_datetime():
    return datetime.now()

def timestamp_to_utc_struct_time(timestamp):
    return time.gmtime(timestamp)

def timestamp_to_local_struct_time(timestamp):
    return time.localtime(timestamp)

def utc_struct_time_to_timestamp(struct_time):
    return calendar.timegm(struct_time)

def local_struct_time_to_timestamp(struct_time):
    return time.mktime(struct_time)

def timestamp_to_utc_datetime(timestamp):
    return datetime.utcfromtimestamp(timestamp)

def timestamp_to_local_datetime(timestamp):
    return datetime.fromtimestamp(timestamp)

def utc_datetime_to_struct_time(dtime):
    return dtime.utctimetuple()

def local_datetime_to_struct_time(dtime):
    return dtime.timetuple()

def utc_datetime_to_timestamp(dtime):
    return calendar.timegm(dtime.utctimetuple())

def local_datetime_to_timestamp(dtime):
    return time.mktime(dtime.timetuple())

    # Since Python 3.4.
    # return dtime.timestamp()

def utc_datetime_to_local_datetime(dtime):
    return datetime.fromtimestamp(calendar.timegm(dtime.utctimetuple()))

def local_datetime_to_utc_datetime(dtime):
    return datetime.utcfromtimestamp(time.mktime(dtime.timetuple()))

    # Since Python 3.6.
    # return dtime.astimezone(timezone.utc)

def struct_time_to_str(struct_time, format):
    return time.strftime(format, struct_time)

def str_to_struct_time(string, format):
    return time.strptime(string, format)

def datetime_to_str(dtime, format):
    return dtime.strftime(format)

def str_to_datetime(string, format):
    return datetime.strptime(string, format)
```
