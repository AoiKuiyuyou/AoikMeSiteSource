--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python setup.py include exclude files flexibly

author: Aoik

create_time: 2019-04-05 20:00:00

tags:
    - python

post_id: 25

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python setup.py include exclude files flexibly
Tested with Python 3.7.0, setuptools 40.9.0, wheel 0.33.1.

The demo project used in this post can be downloaded from [here](https://github.com/AoiKuiyuyou/AoikSetupPyIncludeExclude).

The demo project contains these files:
```
|-- .gitignore
|-- LICENSE.txt
|-- README.md
|-- README.src.md
|-- setup.py
|-- src
    |-- aoiksetuppyincludeexclude
        |-- __init__.py
        |-- excluded_file.txt
        |-- excluded_module.py
        |-- excluded_package
        |   |-- __init__.py
        |   |-- excluded_file.txt
        |   |-- excluded_module.py
        |-- included_file.txt
        |-- included_module.py
        |-- included_package
            |-- __init__.py
            |-- included_file.txt
            |-- included_module.py
```

The goal is to build a source distribution file and a wheel distribution file containing all files in the **src** directory but excluding ones with **excluded** in their name.

\
**setup.py** take 1:
```
# coding: utf-8
from __future__ import absolute_import

import os
import sys

from setuptools import find_packages
from setuptools import setup


if __name__ == '__main__':
    setup(
        name='AoikSetupPyIncludeExclude',

        description=(
            'How to include and exclude Python module files and data files in'
            'setup.py flexibly.'
        ),

        version='0.0.1',

        package_dir={
            '': 'src'
        },

        packages=find_packages('src'),
    )
```

\
Build source distribution file:
```
python setup.py clean sdist
```

\
Files in the source distribution file:
```
|-- PKG-INFO
|-- README.md
|-- setup.cfg
|-- setup.py
|-- src
    |-- aoiksetuppyincludeexclude
        |-- __init__.py
        |-- excluded_module.py
        |-- excluded_package
        |   |-- __init__.py
        |   |-- excluded_module.py
        |-- included_module.py
        |-- included_package
            |-- __init__.py
            |-- included_module.py
```

Wanted files but missing:
```
|-- src
    |-- aoiksetuppyincludeexclude
        |-- included_file.txt
        |-- included_package
            |-- included_file.txt
```

Unwanted files:
```
|-- src
    |-- aoiksetuppyincludeexclude
        |-- excluded_module.py
        |-- excluded_package
        |   |-- __init__.py
        |   |-- excluded_module.py
```

\
Build wheel distribution file:
```
python setup.py clean bdist_wheel
```

\
Files in the wheel file:
```
|-- aoiksetuppyincludeexclude
    |-- __init__.py
    |-- excluded_module.py
    |-- excluded_package
    |   |-- __init__.py
    |   |-- excluded_module.py
    |-- included_module.py
    |-- included_package
        |-- __init__.py
        |-- included_module.py
```

Wanted files but missing:
```
|-- aoiksetuppyincludeexclude
    |-- included_file.txt
    |-- included_package
        |-- included_file.txt
```

Unwanted files but present:
```
|-- aoiksetuppyincludeexclude
    |-- excluded_module.py
    |-- excluded_package
    |   |-- __init__.py
    |   |-- excluded_module.py
```

\
By default the **setup** function does not include non **.py** files. So we
specify its **data_files** arguments to include non **.py** files.

**setup.py** take 2:
```
# coding: utf-8
from __future__ import absolute_import

from setuptools import find_packages
from setuptools import setup


if __name__ == '__main__':
    setup(
        name='AoikSetupPyIncludeExclude',

        description=(
            'How to include and exclude Python module files and data files in'
            'setup.py flexibly.'
        ),

        version='0.0.1',

        package_dir={
            '': 'src'
        },

        packages=find_packages('src'),

        data_files=[
            (
                'Lib/site-packages/aoiksetuppyincludeexclude',
                [
                    'src/aoiksetuppyincludeexclude/included_file.txt',
                ]
            ),
            (
                'Lib/site-packages/aoiksetuppyincludeexclude/included_package',
                [
                    'src/aoiksetuppyincludeexclude/included_package/included_file.txt',
                ]
            ),
        ],
    )
```

\
Build source distribution file:
```
python setup.py clean sdist
```

\
Files in the source distribution file:
```
|-- PKG-INFO
|-- README.md
|-- setup.cfg
|-- setup.py
|-- src
    |-- AoikSetupPyIncludeExclude.egg-info
    |   |-- PKG-INFO
    |   |-- SOURCES.txt
    |   |-- dependency_links.txt
    |   |-- top_level.txt
    |-- aoiksetuppyincludeexclude
        |-- __init__.py
        |-- excluded_module.py
        |-- excluded_package
        |   |-- __init__.py
        |   |-- excluded_module.py
        |-- included_file.txt
        |-- included_module.py
        |-- included_package
            |-- __init__.py
            |-- included_file.txt
            |-- included_module.py
```

Unwanted files but present:
```
|-- src
    |-- aoiksetuppyincludeexclude
        |-- excluded_module.py
        |-- excluded_package
        |   |-- __init__.py
        |   |-- excluded_module.py
```

\
Build wheel distribution file:
```
python setup.py clean bdist_wheel
```

\
Files in the wheel distribution file:
```
|-- AoikSetupPyIncludeExclude-0.0.1.data
|   |-- data
|       |-- Lib
|           |-- site-packages
|               |-- aoiksetuppyincludeexclude
|                   |-- included_file.txt
|                   |-- included_package
|                       |-- included_file.txt
|-- AoikSetupPyIncludeExclude-0.0.1.dist-info
|   |-- METADATA
|   |-- RECORD
|   |-- WHEEL
|   |-- top_level.txt
|-- aoiksetuppyincludeexclude
    |-- __init__.py
    |-- excluded_module.py
    |-- excluded_package
    |   |-- __init__.py
    |   |-- excluded_module.py
    |   |-- included_module.py
    |-- included_module.py
    |-- included_package
        |-- __init__.py
        |-- excluded_module.py
        |-- included_module.py
```

Unwanted files but present:
```
|-- aoiksetuppyincludeexclude
    |-- excluded_module.py
    |-- excluded_package
    |   |-- __init__.py
    |   |-- excluded_module.py
```

There is a problem with using **data_files**. The destination directory must be specified relative to Python's root directory. The relative path from Python's root directory to the project's package directory may vary on different platforms, so the value `Lib/site-packages/aoiksetuppyincludeexclude` is likely to break on a different platform.

And we have not excluded unwanted python module files yet.

\
The solution to include and exclude files flexibly is to override several functions used by **setuptools** during building a distribution file so that custom filtering can be applied to include or exclude files.

**setup.py** take 3:
```
# coding: utf-8
from __future__ import absolute_import

import os

from setuptools import find_packages
from setuptools import setup
import setuptools.command.build_py


# Create custom `find_packages` function.
def custom_find_packages(where='.', exclude=(), include=('*',)):
    """
    Find package names.

    :param where: Start directory.

    :param exclude: Excluded patterns.

    :param include: Included patterns.

    :return: Accepted package names list.
    """
    # Find package names.
    # Delegate to original `find_packages` function.
    package_names = find_packages(where=where, exclude=exclude, include=include)

    # Accepted package names.
    accepted_packages_names = []

    # For each package name.
    for package in package_names:
        # If the package name contains `excluded`.
        if 'excluded' in package:
            # Reject the package name.
            continue
        # If the package name not contains `excluded`.
        else:
            # Accept the package name.
            accepted_packages_names.append(package)

    # Return accepted package names
    return accepted_packages_names


# Store original `find_package_modules` function
find_package_modules = \
    setuptools.command.build_py.build_py.find_package_modules


# Create custom `find_package_modules` function
def custom_find_package_modules(self, package, package_dir):
    """
    Find module infos in given package.

    :param package: Package name.

    :param package_dir: Package directory path.

    :return: Accepted module infos list.
    """
    # Find module infos in the package.
    # Delegate to original `find_package_modules`.
    infos = find_package_modules(self, package, package_dir)

    # Accepted module infos.
    accepted_infos = []

    # For each module info.
    for info in infos:
        # Unpack the module info.
        pkg_full_name, module_bare_name, module_path = info

        # If the module name contains `excluded`.
        if 'excluded' in module_bare_name:
            # Reject the module info.
            continue
        # If the module name not contains `excluded`.
        else:
            # Accept the module info.
            accepted_infos.append(
                (pkg_full_name, module_bare_name, module_path)
            )

    # Return accepted module info list
    return accepted_infos


# Replace original `find_package_modules` function with the custom one.
setuptools.command.build_py.build_py.find_package_modules = \
    custom_find_package_modules


# Store original `find_data_files` function.
find_data_files = \
    setuptools.command.build_py.build_py.find_data_files


# Create custom `find_data_files` function.
def custom_find_data_files(self, package, src_dir):
    """
    Find data file paths in given package.

    :param package: Package name.

    :param src_dir: Package directory path.

    :return: Accepted data file paths list.
    """
    # Accepted data file paths.
    accepted_file_paths = []

    # For each file in the package directory.
    for file_bare_name in os.listdir(src_dir):
        # Get file path.
        file_path = os.path.join(src_dir, file_bare_name)

        # If the file is regular file.
        if os.path.isfile(file_path):
            # If the file is not `.py` file.
            if not file_bare_name.endswith('.py'):
                # If the file name contains `excluded`.
                if 'excluded' in file_bare_name:
                    # Reject the file path.
                    continue
                # If the file name not contains `excluded`.
                else:
                    # Accept the file path.
                    accepted_file_paths.append(file_path)

    # Return accepted data file paths.
    return accepted_file_paths


# Replace original `find_data_files` function with the custom one
setuptools.command.build_py.build_py.find_data_files = \
    custom_find_data_files


if __name__ == '__main__':
    setup(
        # Project name.
        name='AoikSetupPyIncludeExclude',

        # Project description.
        description=(
            'How to include and exclude Python module files and data files in'
            'setup.py flexibly.'
        ),

        # Project version.
        version='0.0.1',

        # Package root directory.
        package_dir={
            '': 'src'
        },

        # Find package names in package root directory `src`.
        packages=custom_find_packages('src'),
    )
```

\
Build source distribution file:
```
python setup.py clean sdist
```

\
Files in the source distribution file:
```
|-- PKG-INFO
|-- README.md
|-- setup.cfg
|-- setup.py
|-- src
    |-- AoikSetupPyIncludeExclude.egg-info
    |   |-- PKG-INFO
    |   |-- SOURCES.txt
    |   |-- dependency_links.txt
    |   |-- top_level.txt
    |-- aoiksetuppyincludeexclude
        |-- __init__.py
        |-- included_file.txt
        |-- included_module.py
        |-- included_package
            |-- __init__.py
            |-- included_file.txt
            |-- included_module.py
```

\
Build wheel distribution file:
```
python setup.py clean bdist_wheel
```

\
Files in the wheel distribution file:
```
|-- AoikSetupPyIncludeExclude-0.0.1.dist-info
|   |-- LICENSE.txt
|   |-- METADATA
|   |-- RECORD
|   |-- WHEEL
|   |-- top_level.txt
|-- aoiksetuppyincludeexclude
    |-- __init__.py
    |-- included_file.txt
    |-- included_module.py
    |-- included_package
        |-- __init__.py
        |-- included_file.txt
        |-- included_module.py
```
