[:var_set('', """
# Compile command
aoikdyndocdsl -s README.src.md -n aoikdyndocdsl.ext.all::nto -g README.md
""")
]\
[:HDLR('heading', 'heading')]\
# AoikMeSiteSource
The source code of site [https://aoik.me/](https://aoik.me/), based on static
site generator [AoikSeldomStaticSite](https://github.com/AoiKuiyuyou/AoikSeldomStaticSite).

## How to build
Tested working with Node.js 10.16.0.

Run in the project directory:
```
npm install

node node_modules/gulp/bin/gulp.js
```
The result static files are inside the `release` directory.
