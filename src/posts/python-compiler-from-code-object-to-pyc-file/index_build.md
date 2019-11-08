--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python's compiler - from code object to pyc file

author: Aoik

create_time: 2019-11-06 20:00:00

tags:
    - python
    - compiler
    - code-object
    - pyc
    - source-code-study
    - 吸星大法强吃源码

post_id: 54

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python's compiler - from code object to pyc file
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
When importing a module for the first time, the module file's source code is
compiled to code object. The code object is then marshalled to a pyc file to
speed up the importing next time.

```
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

    return

  # It is not a pyc file so assume it is a source code file.
  
  # Compile source code to code object.
  importlib._bootstrap_external.SourceLoader.source_to_code

    importlib._bootstrap._call_with_frames_removed

      builtins.compile

  if is hash based:
    # Marshal to pyc data.
    importlib._bootstrap_external._code_to_hash_pyc

      data = bytearray(MAGIC_NUMBER)
      flags = 0b1 | checked << 1
      data.extend(_w_long(flags))
      assert len(source_hash) == 8
      data.extend(source_hash)
      # marshal.dumps..(3VZ5S)
      data.extend(marshal.dumps(code))
  else:
    # Marshal to pyc data.
    importlib._bootstrap_external._code_to_timestamp_pyc

      data = bytearray(MAGIC_NUMBER)
      data.extend(_w_long(0))
      data.extend(_w_long(mtime))
      data.extend(_w_long(source_size))
      # marshal.dumps..(3VZ5S)
      data.extend(marshal.dumps(code))

  # Cache pyc data.
  importlib._bootstrap_external.SourceLoader._cache_bytecode

    importlib._bootstrap_external.SourceFileLoader.set_data

      # Write pyc data to file.
      importlib._bootstrap_external._write_atomic


# ----- 3VZ5S -----
# Marshal code object (and other types of objects) to bytes.
marshal.dumps

  marshal.c.h--marshal_dumps

    marshal.c--marshal_dumps_impl

      marshal.c--PyMarshal_WriteObjectToString

        marshal.c--w_object

          marshal.c--w_complex_object
            if the object is code object:
              W_TYPE(TYPE_CODE, p);
              w_long(co->co_argcount, p);
              w_long(co->co_posonlyargcount, p);
              w_long(co->co_kwonlyargcount, p);
              w_long(co->co_nlocals, p);
              w_long(co->co_stacksize, p);
              w_long(co->co_flags, p);
              w_object(co->co_code, p);
              w_object(co->co_consts, p);
              w_object(co->co_names, p);
              w_object(co->co_varnames, p);
              w_object(co->co_freevars, p);
              w_object(co->co_cellvars, p);
              w_object(co->co_filename, p);
              w_object(co->co_name, p);
              w_long(co->co_firstlineno, p);
              w_object(co->co_lnotab, p);
```
