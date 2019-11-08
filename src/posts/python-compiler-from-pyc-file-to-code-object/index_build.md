--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python's compiler - from pyc file to code object

author: Aoik

create_time: 2019-11-08 22:00:00

tags:
    - python
    - compiler
    - pyc
    - code-object
    - source-code-study
    - 吸星大法强吃源码

post_id: 55

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python's compiler - from pyc file to code object
**Python's compiler series:**
- [Python 3.8.0 execution flow](/blog/posts/python-3.8.0-execution-flow)
- [Python's compiler - from grammar to DFA](/blog/posts/python-compiler-from-grammar-to-dfa)
- [Python's compiler - the grammar file is not LL(1) but the parser is](/blog/posts/python-compiler-the-grammar-file-is-not-ll1-but-the-parser-is)
- [Python's compiler - from tokens to CST](/blog/posts/python-compiler-from-tokens-to-cst)
- [Python's compiler - from CST to AST](/blog/posts/python-compiler-from-cst-to-ast)
- [Python's compiler - from AST to code object](/blog/posts/python-compiler-from-ast-to-code-object)
- [Python's compiler - from code object to pyc file](/blog/posts/python-compiler-from-code-object-to-pyc-file)
- [Python's compiler - from pyc file to code object](/blog/posts/python-compiler-from-pyc-file-to-code-object)

\
When running a pyc file directly, the pyc file is unmarshalled to code object.

When importing a module not for the first time, the module's cached pyc file is
unmarshalled to code object.

```
# ----- 5KWHC -----
# Run pyc file or source code file, or print error.
pythonrun.c--PyRun_SimpleFileExFlags

  # Get main module.
  import.c--PyImport_AddModule("__main__")

  if input file is pyc:
    # Set main module's loader.
    pythonrun.c--set_main_loader(d, filename, "SourcelessFileLoader")

    # Run pyc file.
    pythonrun.c--run_pyc_file...(5QY8K)

  else:
    # Set main module's loader.
    pythonrun.c--set_main_loader(d, filename, "SourceFileLoader")

    # Run source code file.
    pythonrun.c--PyRun_FileExFlags...(5CDIU)

  if failed:
    # Print error.
    pythonrun.c--PyErr_Print


# ----- 5QY8K -----
# Run pyc file.
pythonrun.c--run_pyc_file

  # Read magic number the from pyc file.
  marshal.c--PyMarshal_ReadLongFromFile

  # Read code object the from pyc file.
  marshal.c--PyMarshal_ReadLastObjectFromFile

    if file size <= REASONABLE_FILE_LIMIT:
      # Allocate a read buffer.

      # Read file data into the read buffer.

      # Unmarshal object from the read buffer.
      marshal.c--PyMarshal_ReadObjectFromString

        # Unmarshal object.
        marshal.c--r_object..(5XMEB)
    else:
      # Unmarshal object from the file.
      marshal.c--PyMarshal_ReadObjectFromFile

        # Unmarshal object.
        marshal.c--r_object..(5XMEB)

  # Run code object.
  pythonrun.c--run_eval_code_obj...(6NNRX)


# ----- 6NNRX -----
# Run code object.
pythonrun.c--run_eval_code_obj
  PyDict_SetItemString(globals, "__builtins__", interp->builtins)

  ceval.c--PyEval_EvalCode

    ceval.c--PyEval_EvalCodeEx

      ceval.c--_PyEval_EvalCodeWithName

        ceval.c--PyEval_EvalFrameEx

          ceval.c--_PyEval_EvalFrameDefault


# ----- 7HQTL -----
# Evaluate bytecode.
ceval.c--_PyEval_EvalFrameDefault

  switch on opcode
  case TARGET(IMPORT_NAME)

    ceval.c--import_name

      bltinmodule.c--builtin___import__..(3RSAS)


# ----- 5SRML -----
# Import module.
builtins.__import__

  bltinmodule.c--builtin___import__..(3RSAS)


# ----- 3RSAS -----
# Import module.
bltinmodule.c--builtin___import__

  import.c--PyImport_ImportModuleLevelObject

    import.c--import_find_and_load

      # `interp->importlib` is module `_frozen_importlib`.
      # `_frozen_importlib` is a frozen version of Python module
      # `importlib._bootstrap`, embedded directly in C code.
      _PyObject_CallMethodIdObjArgs(interp->importlib,
        &PyId__find_and_load, abs_name, interp->import_func, NULL)

        _frozen_importlib._find_and_load..(6IYVN)


# ----- 5E9VZ -----
# Import module.
importlib.__import__
importlib._bootstrap.__import__

  importlib._bootstrap._gcd_import

    importlib._bootstrap._find_and_load..(6IYVN)


# ----- 6IYVN -----
# Find module spec and import module.
importlib._bootstrap._find_and_load

  importlib._bootstrap._find_and_load_unlocked

    importlib._bootstrap._load_unlocked

      importlib._bootstrap.module_from_spec

      spec.loader.exec_module

        importlib._bootstrap_external._LoaderBasics.exec_module

          importlib._bootstrap_external.SourceLoader.get_code..(7HMAH)

          importlib._bootstrap._call_with_frames_removed

            exec(code, module.__dict__)


# ----- 7HMAH -----
# Get code object.
importlib._bootstrap_external.SourceLoader.get_code

  # Read file data.
  importlib._bootstrap_external.FileLoader.get_data

  # Check the pyc header's type.
  importlib._bootstrap_external._classify_pyc

  if the pyc header is hash based:
    # Compute file data's hash.
    _imp.source_hash

    # Validate using hash.
    importlib._bootstrap_external._validate_hash_pyc
  else:
    # Validate using timestamp.
    importlib._bootstrap_external._validate_timestamp_pyc

  if the pyc data is validated:
    # Unmarshal the pyc data to code object.
    importlib._bootstrap_external._compile_bytecode

      # Unmarshal object.
      marshal.loads..(3VNSD)

    return

  # It is not a pyc file so assume it is a source code file.
  ...


# ----- 3VNSD -----
# Unmarshal object.
marshal.loads

  marshal.c.h--marshal_loads

    marshal.c--marshal_loads_impl

      marshal.c--read_object

        marshal.c--r_object..(5XMEB)


# ----- 5XMEB -----
# Unmarshal object.
marshal.c--r_object
  code = r_byte(p)
  flag = code & FLAG_REF;
  type = code & ~FLAG_REF;
  switch on `type`
  case TYPE_CODE:
    argcount = (int)r_long(p);
    posonlyargcount = (int)r_long(p);
    kwonlyargcount = (int)r_long(p);
    nlocals = (int)r_long(p);
    stacksize = (int)r_long(p);
    flags = (int)r_long(p);
    code = r_object(p);
    consts = r_object(p);
    names = r_object(p);
    varnames = r_object(p);
    freevars = r_object(p);
    cellvars = r_object(p);
    filename = r_object(p);
    name = r_object(p);
    firstlineno = (int)r_long(p);
    lnotab = r_object(p);
    # codeobject.c--PyCode_NewWithPosOnlyArgs..(6DQ7T)
    PyCode_NewWithPosOnlyArgs(
      argcount, posonlyargcount, kwonlyargcount,
      nlocals, stacksize, flags,
      code, consts, names, varnames,
      freevars, cellvars, filename, name,
      firstlineno, lnotab
    );


# ----- 6DQ7T -----
codeobject.c--PyCode_NewWithPosOnlyArgs
  # codeobject.c--intern_strings
  intern_strings(names);
  intern_strings(varnames);
  intern_strings(freevars);
  intern_strings(cellvars);

  # codeobject.c--intern_string_constants
  intern_string_constants(consts);

  if have cell names:
    # Compute `cell2arg`.

    if `cell2arg` is not used:
      cell2arg = NULL;
  }

  # code.h--PyCodeObject
  # codeobject.c--PyCode_Type
  co = PyObject_NEW(PyCodeObject, &PyCode_Type);

  co->co_argcount = argcount;
  co->co_posonlyargcount = posonlyargcount;
  co->co_kwonlyargcount = kwonlyargcount;
  co->co_nlocals = nlocals;
  co->co_stacksize = stacksize;
  co->co_flags = flags;
  co->co_code = code;
  co->co_consts = consts;
  co->co_names = names;
  co->co_varnames = varnames;
  co->co_freevars = freevars;
  co->co_cellvars = cellvars;
  co->co_cell2arg = cell2arg;
  co->co_filename = filename;
  co->co_name = name;
  co->co_firstlineno = firstlineno;
  co->co_lnotab = lnotab;
  co->co_zombieframe = NULL;
  co->co_weakreflist = NULL;
  co->co_extra = NULL;

  co->co_opcache_map = NULL;
  co->co_opcache = NULL;
  co->co_opcache_flag = 0;
  co->co_opcache_size = 0;
```
