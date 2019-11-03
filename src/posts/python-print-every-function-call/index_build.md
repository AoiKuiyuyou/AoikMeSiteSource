--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python print every function call

author: Aoik

create_time: 2019-08-24 22:00:00

tags:
    - python

post_id: 43

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python print every function call

## Method 1 - Modify Python source code
Download Python 3.7.4 source code to `/home/test/python`.

\
Add to the start of function `/home/test/python/Python/ceval.c--_PyEval_EvalFrameDefault`:
```
    PyCodeObject* code = f->f_code;
    PyObject* fileName = code->co_filename;
    const char* fileNameCStr = PyUnicode_AsUTF8(fileName);
    int funcLineNum = f->f_lineno;
    PyObject* funcName = code->co_name;
    const char* funcNameCStr = PyUnicode_AsUTF8(funcName);
    
    if (strncmp("<frozen importlib._bootstrap", fileNameCStr, 28)
        && strncmp("/home/test/python/Lib", fileNameCStr, 22)) {
        for (int i = 0; i < funcLevel; i++) {
            fprintf(stdout, "    ");
        }
        
        fprintf(
            stdout,
            "# ----- %s#L%i::%s -----\n",
            fileNameCStr,
            funcLineNum,
            funcNameCStr
        );
        
        funcLevel++;
    }
```

\
Add to the end (before the return statement) of function `/home/test/python/Python/ceval.c--_PyEval_EvalFrameDefault`:
```
    if (strncmp("<frozen importlib._bootstrap", fileNameCStr, 28)
        && strncmp("/home/test/python/Lib", fileNameCStr, 22)) {
        funcLevel--;
        
        for (int i = 0; i < funcLevel; i++) {
            fprintf(stdout, "    ");
        }
        
        fprintf(
            stdout,
            "# ===== %s#L%i::%s =====\n",
            fileNameCStr,
            funcLineNum,
            funcNameCStr
        );
        
        funcLevel++;
    }
```

\
Compile Python.

\
Create `test.py`:
```
def f():
    pass

def g():
    f()

def h():
    g()

if __name__ == '__main__':
    exit(h())
```

\
Run `test.py`:
```
/home/test/python/python test.py > log.txt
```

\
The result in `log.txt` is:
```
# ----- test.py#L1::<module> -----
    # ----- test.py#L7::h -----
        # ----- test.py#L4::g -----
            # ----- test.py#L1::f -----
            # ===== test.py#L1::f =====
        # ===== test.py#L4::g =====
    # ===== test.py#L7::h =====
# ===== test.py#L1::<module> =====
```

## Method 2 - Use GDB
Download Python 3.7.4 source code to `/home/test/python`.

\
Copy `python-gdb.py` to current directory:
```
cp /home/test/python/python-gdb.py ./python-gdb.py
```

\
Add to `python-gdb.py`:
```
class PrintPythonFuncInfoCommand(gdb.Command):

    def __init__(self):
        gdb.Command.__init__ (
            self,
            "print_python_func_info",
            gdb.COMMAND_FILES,
            gdb.COMPLETE_NONE,
        )

    def invoke(self, args, from_tty):
        frame = Frame.get_selected_bytecode_frame()
        if not frame:
            print('Unable to locate gdb frame for python bytecode interpreter')
            return

        pyop = frame.get_pyop()
        if not pyop or pyop.is_optimized_out():
            print('Unable to read information on python frame')
            return

        filename = pyop.filename()
        name = pyop.co_name.proxyval(set())
        lineno = pyop.current_line_num()
        if lineno is None:
            print('Unable to read python frame line number')
            return

        sys.stdout.write('{0}#L{1}::{2}'.format(filename, lineno, name))
        
PrintPythonFuncInfoCommand()
```

\
Create `PrintPythonFuncCalls.py`:
```
import gdb


BREAK_SPECS = [
    (
        '_PyEval_EvalFrameDefault'
        ' if strncmp("<frozen importlib._bootstrap",'
        ' PyUnicode_AsUTF8(f->f_code->co_filename),'
        ' 28) &&'
        ' strncmp("/home/test/python/Lib/",'
        ' PyUnicode_AsUTF8(f->f_code->co_filename),'
        ' 22)'
    ),
    (
        # _PyEval_EvalFrameDefault last statement before return.
        'ceval.c:3498'
        ' if strncmp("<frozen importlib._bootstrap",'
        ' PyUnicode_AsUTF8(f->f_code->co_filename),'
        ' 28) &&'
        ' strncmp("/home/test/python/Lib/",'
        ' PyUnicode_AsUTF8(f->f_code->co_filename),'
        ' 22)'
    ),
]


class Executor:
    def __init__(self, cmd):
        self.__cmd = cmd

    def __call__(self):
        gdb.execute(self.__cmd)


OUTPUT_FILE = open('log.txt', mode='w', encoding='utf-8')

FUNC_LEVEL = 0

FUNC_INFOS = []

def stop_handler(event):
    global FUNC_LEVEL

    is_exit = event.breakpoint.number == 2

    if is_exit:
        func_info = FUNC_INFOS.pop()

        FUNC_LEVEL -= 1

        OUTPUT_FILE.write(
            '{0}# ===== {1} =====\n'.format(
                '    ' * FUNC_LEVEL,
                func_info,
            )
        )
    else:
        func_info = gdb.execute('print_python_func_info', to_string=True)

        FUNC_INFOS.append(func_info)

        OUTPUT_FILE.write(
            '{0}# ----- {1} -----\n'.format(
                '    ' * FUNC_LEVEL,
                func_info,
            )
        )

        FUNC_LEVEL += 1

    OUTPUT_FILE.flush()

    gdb.post_event(Executor('continue'))


def setup():
    gdb.execute('set pagination off')

    for break_spec in BREAK_SPECS:
        gdb.execute('break {0}'.format(break_spec))

    gdb.events.stop.connect(stop_handler)


if __name__ == '__main__':
    setup()
```

\
Create `test.py`:
```
def f():
    pass

def g():
    f()

def h():
    g()

if __name__ == '__main__':
    exit(h())
```

\
Run `test.py` with GDB:
```
gdb -ex 'source python-gdb.py' -ex 'source PrintPythonFuncCalls.py' -ex run --args /home/test/python/python test.py
```

\
The result in `log.txt` is:
```
# ----- test.py#L1::<module> -----
    # ----- test.py#L7::h -----
        # ----- test.py#L4::g -----
            # ----- test.py#L1::f -----
            # ===== test.py#L1::f =====
        # ===== test.py#L4::g =====
    # ===== test.py#L7::h =====
# ===== test.py#L1::<module> =====
```
