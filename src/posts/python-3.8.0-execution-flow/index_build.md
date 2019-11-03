--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python 3.8.0 execution flow

author: Aoik

create_time: 2019-10-20 20:00:00

tags:
    - python
    - execution-flow
    - source-code-study
    - 吸星大法强吃源码

post_id: 46

$template:
    file: root://src/posts/_base/post_page_base_no_highlight.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python 3.8.0 execution flow
```
# Windows
python.c--wmain
# Not Windows
python.c--main

  # Windows
  main.c--Py_Main
  # Not Windows
  main.c--Py_BytesMain

    main.c--pymain_main

      main.c--pymain_init

      main.c--Py_RunMain

        main.c--pymain_run_python

          # Run bytecode file or source code file, or run REPL mode loop.
          main.c--pymain_run_filename

            # Run bytecode file or source code file, or run REPL mode loop.
            pythonrun.c--PyRun_AnyFileExFlags

              # Run bytecode file or source code file, or print error.
              pythonrun.c--PyRun_SimpleFileExFlags

                # Run source code file.
                pythonrun.c--PyRun_FileExFlags

                  # Compile file to AST node.
                  pythonrun.c--PyParser_ASTFromFileObject

                    # Compile file to CST.
                    parsetok.c--PyParser_ParseFileObject

                      # Create tokenizer.
                      tokenizer.c--PyTokenizer_FromFile

                      # Compile string to CST.
                      parsetok.c--parsetok

                        # Create parser state.
                        parser.c--PyParser_New

                        # Transit DFA and create CST nodes.
                        parser.c--PyParser_AddToken

                    # Convert CST to AST node.
                    ast.c--PyAST_FromNodeObject

                  # Compile AST node to code object and run.
                  pythonrun.c--run_mod

                    # Compile AST node to code object.
                    compile.c--PyAST_CompileObject

                    # Run code object.
                    pythonrun.c--run_eval_code_obj

                      ceval.c--PyEval_EvalCode

                        ceval.c--PyEval_EvalCodeEx

                          ceval.c--_PyEval_EvalCodeWithName

                            ceval.c--PyEval_EvalFrameEx

                              ceval.c--_PyEval_EvalFrameDefault


# ----- 2A3CK -----
# Windows
python.c--wmain
# Not Windows
python.c--main

  # Windows
  main.c--Py_Main
  # Not Windows
  main.c--Py_BytesMain

    main.c--pymain_main

      main.c--pymain_init...(7GST4)

      main.c--Py_RunMain...(7ITOC)


# ----- 7GST4 -----
main.c--pymain_init

  pylifecycle.c--_PyRuntime_Initialize

    pystate.c--_PyRuntimeState_Init

      obmalloc.c--_PyMem_SetDefaultAllocator

      pystate.c--_PyRuntimeState_Init_impl

        gcmodule.c--_PyGC_Initialize

        ceval.c_PyEval_Initialize

        preconfig.c--PyPreConfig_InitPythonConfig

      obmalloc.c--PyMem_SetAllocator

  pylifecycle.c--preconfig.c--PyPreConfig_InitPythonConfig

  pylifecycle.c--_Py_PreInitializeFromPyArgv

    pylifecycle.c--_PyRuntime_Initialize

  initconfig.c--PyConfig_InitPythonConfig

  # Windows
  initconfig.c--PyConfig_SetArgv
  # Not Windows
  initconfig.c--PyConfig_SetBytesArgv

    initconfig.c--_PyConfig_SetPyArgv

      pylifecycle.c--_Py_PreInitializeFromConfig

        pylifecycle.c--_PyRuntime_Initialize

        preconfig.c--_PyPreConfig_InitFromConfig

          preconfig.c--PyPreConfig_InitPythonConfig

        pylifecycle.c--Py_PreInitialize

          pylifecycle.c--_Py_PreInitializeFromPyArgv

        pylifecycle.c--_Py_PreInitializeFromPyArgv

  pylifecycle.c--Py_InitializeFromConfig

    pylifecycle.c--_PyRuntime_Initialize

    pylifecycle.c--pyinit_core

      pylifecycle.c--_Py_PreInitializeFromConfig

      initconfig.c--_PyConfig_InitCompatConfig

      initconfig.c--_PyConfig_Copy

      initconfig.c--PyConfig_Read

      if !core_initialized:
        pylifecycle.c--pyinit_config

          pylifecycle.c--pycore_init_runtime

            bootstrap_hash.c--_Py_HashRandomization_Init

            pystate.c--_PyInterpreterState_Enable

              obmalloc.c--_PyMem_SetDefaultAllocator

              PyThread_allocate_lock

              obmalloc.c--PyMem_SetAllocator

          pylifecycle.c--pycore_create_interpreter

          pylifecycle.c--pycore_init_types

            object.c--_PyTypes_Init

          sysmodule.c--_PySys_Create

          pylifecycle.c--pycore_init_builtins

          pylifecycle.c--pycore_init_import_warnings

            import.c--_PyImport_Init

            import.c--_PyImportHooks_Init

            _warnings.c--_PyWarnings_Init

            if config->_install_importlib:
              pylifecycle.c--init_importlib

                # import.c--PyImport_ImportFrozenModule
                PyImport_ImportFrozenModule("_frozen_importlib")

                  import.c--PyImport_ImportFrozenModuleObject

                    marshal.c--PyMarshal_ReadObjectFromString

                # import.c--PyImport_AddModule
                importlib = PyImport_AddModule("_frozen_importlib");

                interp->importlib = importlib;

                interp->import_func = PyDict_GetItemString(interp->builtins, "__import__");

                import.c--PyInit__imp

                import.c--_PyImport_SetModuleString("_imp", impmod)

                PyObject_CallMethod(importlib, "_install", "OO", sysmod, impmod)
      else:
        pylifecycle.c--pyinit_core_reconfigure

          if _install_importlib:
            pathconfig.c--_PyConfig_WritePathConfig

              pathconfig.c--_PyPathConfig_InitDLLPath

              pathconfig.c--pathconfig_set_from_config

    if config->_init_main:
      pylifecycle.c--pyinit_main

        pytime.c--_PyTime_Init

        sysmodule.c--_PySys_InitMain

        pylifecycle.c--init_importlib_external

          PyObject_CallMethod(interp->importlib

          import.c--_PyImportZip_Init

        faulthandler.c--_PyFaulthandler_Init

        unicodeobject.c--_PyUnicode_InitEncodings

          unicodeobject.c--init_fs_encoding

            unicodeobject.c--config_get_codec_name

            unicodeobject.c--init_fs_codec

              preconfig.c--_Py_SetFileSystemEncoding

          unicodeobject.c--init_stdio_encoding

        if config->install_signal_handlers:
          pylifecycle.c--init_signals

            signalmodule.c--PyOS_InitInterrupts

              PyImport_ImportModule("_signal")

        _tracemalloc.c--_PyTraceMalloc_Init

        pylifecycle.c--add_main_module

          PyImport_AddModule("__main__")

          PyImport_ImportModule("builtins")

          PyDict_SetItemString(d, "__builtins__", bimod)

        pylifecycle.c--init_sys_streams

          pylifecycle.c--create_stdio

        PyImport_ImportModule("warnings")

        runtime->initialized = 1

        if config->site_import:

          pylifecycle.c--init_import_size

            PyImport_ImportModule("site")


# ----- 7ITOC -----
main.c--Py_RunMain

  main.c--pymain_run_python

    pymain_get_importer

    pymain_sys_path_add_path0

    _PyPathConfig_ComputeSysPath0

    pymain_sys_path_add_path0

    main.c--pymain_header

    main.c--pymain_import_readline

    if config->run_command:
      main.c--pymain_run_command

        # Run source code string, or print error.
        pythonrun.c--PyRun_SimpleStringFlags...(27BNG)

    elif config->run_module:
      # Run a module.
      main.c--pymain_run_module...(7K9R2)

    elif main_importer_path != NULL:
      # Run a module.
      main.c--pymain_run_module...(7K9R2)(L"__main__", 0)

    elif if config->run_filename != NULL:
      # Run bytecode file or source code file, or run REPL mode loop.
      main.c--pymain_run_filename...(2CMFT)

    else:
      # Run REPL mode.
      main.c--pymain_run_stdin...(5JZ43)

    # Run REPL mode.
    main.c--pymain_repl...(3QBQM)

  pylifecycle.c--Py_FinalizeEx

  main.c--pymain_free


# ----- 3QBQM -----
# Run REPL mode.
main.c--pymain_repl

  main.c--pymain_run_interactive_hook

  # Run bytecode file or source code file,
  # or run REPL mode.
  pythonrun.c--PyRun_AnyFileFlags...(2TCT7)


# ----- 5JZ43 -----
# Run REPL mode.
main.c--pymain_run_stdin
  if stdin_is_interactive(config):
    main.c--pymain_run_startup

      # Run bytecode file or source code file, or print error.
      pythonrun.c--PyRun_SimpleFileExFlags...(5KWHC)

    main.c--pymain_run_interactive_hook

    ceval.c--Py_MakePendingCalls

    # Run bytecode file or source code file, or run REPL mode loop.
    pythonrun.c--PyRun_AnyFileExFlags...(3DSCF)


# ----- 7K9R2 -----
# Run a module.
main.c--pymain_run_module

  PyImport_ImportModule("runpy")

  runmodule = PyObject_GetAttrString(runpy, "_run_module_as_main")

  PyObject_Call(runmodule, runargs, NULL)


# ----- 2CMFT -----
# Run bytecode file or source code file, or run REPL mode loop.
main.c--pymain_run_filename

  main.c--pymain_run_startup

  main.c--pymain_run_interactive_hook

  main.c--pymain_run_main_from_importer

  main.c--pymain_open_filename

  main.c--pymain_run_file

    ceval.c--Py_MakePendingCalls

    # Run bytecode file or source code file, or run REPL mode loop.
    pythonrun.c--PyRun_AnyFileExFlags...(3DSCF)


# ----- 37NUC -----
# Run bytecode file or source code file, or run REPL mode loop.
pythonrun.c--PyRun_AnyFile

  # Run bytecode file or source code file, or run REPL mode loop.
  # Argument closeit=0
  # Argument flags=NULL
  pythonrun.c--PyRun_AnyFileExFlags...(3DSCF)


# ----- 7YOPN -----
# Run bytecode file or source code file, or run REPL mode loop.
pythonrun.c--PyRun_AnyFileEx

  # Run bytecode file or source code file, or run REPL mode loop.
  # Argument flags=NULL
  pythonrun.c--PyRun_AnyFileExFlags...(3DSCF)


# ----- 2TCT7 -----
# Run bytecode file or source code file, or run REPL mode loop.
pythonrun.c--PyRun_AnyFileFlags

  # Run bytecode file or source code file, or run REPL mode loop.
  # Argument closeit=0
  pythonrun.c--PyRun_AnyFileExFlags...(3DSCF)


# ----- 3DSCF -----
# Run bytecode file or source code file, or run REPL mode loop. pythonrun.c--PyRun_AnyFileExFlags

  if input file is interactive:
    # Run REPL mode loop.
    pythonrun.c--PyRun_InteractiveLoopFlags...(6MR72)
  else:
    # Run bytecode file or source code file, or print error.
    pythonrun.c--PyRun_SimpleFileExFlags...(5KWHC)


# ----- 2Z331 -----
# Run REPL mode loop.
pythonrun.c--PyRun_InteractiveLoop

  # Run REPL mode loop.
  # Argument flags=NULL
  pythonrun.c--PyRun_InteractiveLoopFlags


# ----- 6MR72 -----
# Run REPL mode loop.
pythonrun.c--PyRun_InteractiveLoopFlags

  # Run REPL mode once.
  pythonrun.c--PyRun_InteractiveOneObjectEx...(3AHSO)

    # Compile file to AST node.
    pythonrun.c--PyParser_ASTFromFileObject...(2EO8C)

    # Compile AST node to code object and run.
    pythonrun.c--run_mod...(24U9T)

    pythonrun.c--flush_io


# ----- 6FZOG -----
# Run REPL mode once, or print error.
pythonrun.c--PyRun_InteractiveOne

  # Run REPL mode once, or print error.
  # Argument flags=NULL
  pythonrun.c--PyRun_InteractiveOneFlags


# ----- 2GMXD -----
# Run REPL mode once, or print error.
pythonrun.c--PyRun_InteractiveOneFlags
  # Create unicode file name
  unicodeobject.c--PyUnicode_DecodeFSDefault

  # Run REPL mode once, or print error.
  PyRun_InteractiveOneObject


# ----- 2GMXD -----
# Run REPL mode once, or print error.
pythonrun.c--PyRun_InteractiveOneObject

  # Run REPL mode once.
  pythonrun.c--PyRun_InteractiveOneObjectEx

  if failed:
    pythonrun.c--PyErr_Print

    pythonrun.c--flush_io


# ----- 3AHSO -----
# Run REPL mode once.
pythonrun.c--PyRun_InteractiveOneObjectEx

  # Compile file to AST node.
  pythonrun.c--PyParser_ASTFromFileObject...(2EO8C)

  # Compile AST node to code object and run.
  pythonrun.c--run_mod...(24U9T)


# ----- 65PFM -----
# Run bytecode file or source code file, or print error.
pythonrun.c--PyRun_SimpleFile

  # Run bytecode file or source code file, or print error.
  # Argument closeit=0
  # Argument flags=NULL
  pythonrun.c--PyRun_SimpleFileExFlags


# ----- 7VDBN -----
# Run bytecode file or source code file, or print error.
pythonrun.c--PyRun_SimpleFileEx

  # Run bytecode file or source code file, or print error.
  # Argument flags=NULL
  pythonrun.c--PyRun_SimpleFileExFlags


# ----- 5KWHC -----
# Run bytecode file or source code file, or print error.
pythonrun.c--PyRun_SimpleFileExFlags

  import.c--PyImport_AddModule("__main__")

  if input file is pyc:
    pythonrun.c--set_main_loader(d, filename, "SourcelessFileLoader")

    # Run pyc file.
    pythonrun.c--run_pyc_file...(5QY8K)

  else:
    pythonrun.c--set_main_loader(d, filename, "SourceFileLoader")

    # Run source code file.
    pythonrun.c--PyRun_FileExFlags...(5CDIU)

  if failed:
    pythonrun.c--PyErr_Print


# ----- 52NNG -----
# Run source code file.
pythonrun.c--PyRun_File

  # Run source code file.
  # Argument closeit=0
  # Argument flags=NULL
  pythonrun.c--PyRun_FileExFlags...(5CDIU)


# ----- 3OMLO -----
# Run source code file.
pythonrun.c--PyRun_FileFlags

  # Run source code file.
  # Argument closeit=0
  pythonrun.c--PyRun_FileExFlags...(5CDIU)


# ----- 3OMLO -----
# Run source code file.
pythonrun.c--PyRun_FileEx

  # Run source code file.
  # Argument flags=NULL
  pythonrun.c--PyRun_FileExFlags...(5CDIU)


# ----- 5CDIU -----
# Run source code file.
pythonrun.c--PyRun_FileExFlags

  # Compile file to AST node.
  pythonrun.c--PyParser_ASTFromFileObject...(2EO8C)

  # Compile AST node to code object and run.
  pythonrun.c--run_mod...(24U9T)


# ----- 3ERG4 -----
# Run source code string, or print error.
pythonrun.c--PyRun_SimpleString

  # Run source code string, or print error.
  # Argument flags=NULL
  pythonrun.c--PyRun_SimpleStringFlags


# ----- 27BNG -----
# Run source code string, or print error.
pythonrun.c--PyRun_SimpleStringFlags

  # Run source code string.
  # Argument start=Py_file_input
  pythonrun.c--PyRun_StringFlags...(69YSH)

  if failed:
    pythonrun.c--PyErr_Print


# ----- 6CTW2 -----
# Run source code string.
pythonrun.c--PyRun_String

  # Run source code string.
  # Argument flags=NULL
  pythonrun.c--PyRun_StringFlags...(69YSH)


# ----- 69YSH -----
# Run source code string.
pythonrun.c--PyRun_StringFlags

  # Compile string to AST node.
  pythonrun.c--PyParser_ASTFromStringObject...(7FMMG)

  # Compile AST to code object and run.
  pythonrun.c--run_mod...(24U9T)


# ----- 3CYWG -----
# Run source code string.
bltinmodule.c--builtin_exec_impl

  if MergeCompilerFlags:
    # Run source code string.
    pythonrun.c--PyRun_StringFlags...(69YSH)
  else:
    # Run source code string.
    pythonrun.c--PyRun_String...(6CTW2)


# ----- 5H5FI -----
# Run code object or source code string.
bltinmodule.c--builtin_eval_impl

  if is code object:
    # Run code object.
    ceval.c--PyEval_EvalCode
  else:
    # Run source code string.
    pythonrun.c--PyRun_StringFlags...(69YSH)


# ----- 6NP85 -----
# Compile file to CST, or set error object.
pythonrun.c--PyParser_SimpleParseFile

  # Compile file to CST, or set error object.
  # Argument flags=0
  pythonrun.c--PyParser_SimpleParseFileFlags...(5OB32)


# ----- 5OB32 -----
# Compile file to CST, or set error object.
pythonrun.c--PyParser_SimpleParseFileFlags

  # Compile file to CST.
  # Argument grammar=&_PyParser_Grammar
  # Argument enc=NULL
  # Argument ps1=NULL
  # Argument ps2=NULL
  parsetok.c--PyParser_ParseFileFlags...(71DXC)

  if compiling failed:
    # Set error object.
    pythonrun.c--err_input


# ----- 71DXC -----
# Compile file to CST.
parsetok.c--PyParser_ParseFileFlags

  # Compile file to CST.
  # Argument flags=iflags
  parsetok.c--PyParser_ParseFileFlagsEx...(3Y7WU)


# ----- 3Y7WU -----
# Compile file to CST.
parsetok.c--PyParser_ParseFileFlagsEx

  # Create unicode file name
  unicodeobject.c--PyUnicode_DecodeFSDefault

  # Compile file to CST.
  parsetok.c--PyParser_ParseFileObject...(6QYRQ)


# ----- 6QYRQ -----
# Compile file to CST.
parsetok.c--PyParser_ParseFileObject

  # Create tokenizer.
  tokenizer.c--PyTokenizer_FromFile

  # Compile string to CST.
  parsetok.c--parsetok...(68SVC)


# ----- 7BKAH -----
# Compile string to CST, or set error object.
pythonrun.c--PyParser_SimpleParseString

  # Compile string to CST, or set error object.
  # Argument flags=0
  pythonrun.c--PyParser_SimpleParseStringFlags...(6A1C2)


# ----- 6A1C2 -----
# Compile string to CST, or set error object.
pythonrun.c--PyParser_SimpleParseStringFlags

  # Compile string to CST.
  # Argument grammar=&_PyParser_Grammar
  parsetok.c--PyParser_ParseStringFlags...(6Z5XL)

  if compiling failed:
    # Set error object.
    pythonrun.c--err_input


# ----- 1WHTV -----
# Compile string to CST, or set error object.
pythonrun.c--PyParser_SimpleParseStringFlagsFilename

  # Compile string to CST.
  # Argument grammar=&_PyParser_Grammar
  parsetok.c--PyParser_ParseStringFlagsFilename...(7G8MS)

  if compiling failed:
    # Set error object.
    pythonrun.c--err_input


# ----- 6DJVQ -----
# Compile string to CST.
parsetok.c--PyParser_ParseString

  # Compile string to CST.
  # Argument filename=NULL
  # Argument flags=0
  parsetok.c--PyParser_ParseStringFlagsFilename...(7G8MS)


# ----- 6Z5XL -----
# Compile string to CST.
parsetok.c--PyParser_ParseStringFlags

  # Compile string to CST.
  # Argument filename=NULL
  # Argument grammar=&_PyParser_Grammar
  parsetok.c--PyParser_ParseStringFlagsFilename...(7G8MS)


# ----- 7G8MS -----
# Compile string to CST.
parsetok.c--PyParser_ParseStringFlagsFilename

  # Compile string to CST.
  # Argument flag=iflags
  parsetok.c--PyParser_ParseStringFlagsFilenameEx...(5UP2X)


# ----- 6PML4 -----
# Compile string to CST.
parsermodule.c--parser_do_parse

  # Compile string to CST.
  # Argument filename=NULL
  parsetok.c--PyParser_ParseStringFlagsFilenameEx...(5UP2X)


# ----- 5UP2X -----
# Compile string to CST.
parsetok.c--PyParser_ParseStringFlagsFilenameEx

  # Create unicode file name
  unicodeobject.c--PyUnicode_DecodeFSDefault

  # Compile string to CST.
  parsetok.c--PyParser_ParseStringObject...(6PQEP)


# ----- 6PQEP -----
# Compile string to CST.
parsetok.c--PyParser_ParseStringObject
  # Create tokenizer.
  PyTokenizer_FromUTF8
  PyTokenizer_FromString

  # Compile string to CST.
  parsetok.c--parsetok...(68SVC)


# ----- 68SVC -----
# Compile string to CST.
parsetok.c--parsetok

  # Create parser state.
  parser.c--PyParser_New

  # Transit DFA and create CST nodes.
  parser.c--PyParser_AddToken


# ----- 57I7M -----
# Convert CST to AST.
ast.c--PyAST_FromNodeObject


# ----- 52SA2 -----
# Compile file to AST node.
pythonrun.c--PyParser_ASTFromFile

  # Create unicode file name
  unicodeobject.c--PyUnicode_DecodeFSDefault

  # Compile file to AST node.
  pythonrun.c--PyParser_ASTFromFileObject...(2EO8C)


# ----- 2EO8C -----
# Compile file to AST node.
pythonrun.c--PyParser_ASTFromFileObject

  # Compile file to CST.
  # Argument grammar=&_PyParser_Grammar
  parsetok.c--PyParser_ParseFileObject...(6QYRQ)

  # Convert CST to AST node.
  ast.c--PyAST_FromNodeObject...(57I7M)


# ----- 6QSZL -----
# Compile string to AST node.
pythonrun.c-PyParser_ASTFromString
  # Create unicode file name
  unicodeobject.c--PyUnicode_DecodeFSDefault

  # Compile string to AST node.
  pythonrun.c--PyParser_ASTFromStringObject...(7FMMG)


# ----- 7FMMG -----
# Compile string to AST node.
pythonrun.c--PyParser_ASTFromStringObject

  # Compile string to CST.
  # Argument grammar=&_PyParser_Grammar
  parsetok.c--PyParser_ParseStringObject...(6PQEP)

    # Compile string to CST.
    parsetok.c--parsetok...(68SVC)

  # Convert CST to AST node.
  ast.c--PyAST_FromNodeObject...(57I7M)


# ----- 5FZWJ -----
# Compile AST node to code object.
compile.c--PyAST_CompileObject


# ----- 24U9T -----
# Compile AST node to code object and run.
pythonrun.c--run_mod
  # Compile AST node to code object.
  compile.c--PyAST_CompileObject...(5FZWJ)

  # Run code object.
  pythonrun.c--run_eval_code_obj...(6NNRX)


# ----- 2HBRP -----
# Compile string to code object.
pythonrun.c--Py_CompileString

  # Compile string to code object.
  # Argument flags=NULL
  # Argument optimize=-1
  pythonrun.c--Py_CompileStringExFlags


# ----- 7QLOP -----
# Compile string to code object.
pythonrun.c--Py_CompileStringFlags

  # Compile string to code object.
  # Argument optimize=-1
  pythonrun.c--Py_CompileStringExFlags


# ----- 6QYQF -----
# Compile string to code object.
pythonrun.c--Py_CompileStringExFlags

  # Create unicode file name
  unicodeobject.c--PyUnicode_DecodeFSDefault

  # Compile string to AST object or code object.
  pythonrun.c--Py_CompileStringObject...(7CPPY)


_freeze_importlib.c--main

  pythonrun.c--Py_CompileStringExFlags


# ----- 7CPPY -----
# Compile string to AST object or code object.
pythonrun.c--Py_CompileStringObject
  # Compile string to AST node.
  pythonrun.c--PyParser_ASTFromStringObject...(7FMMG)

  if flag PyCF_ONLY_AST is on:
    # Convert AST node to AST object.
    Python-ast.c--PyAST_mod2obj
  else:
    # Compile AST node to code object.
    compile.c--PyAST_CompileObject...(5FZWJ)


# ----- 5VXWX -----
# Compile string or AST object to code object.
# Exposed as builtin function.
bltinmodule.c.h--builtin_compile

  # Compile string or AST object to code object.
  bltinmodule.c--builtin_compile_impl


# ----- 3WFME -----
# Compile string or AST object to code object.
bltinmodule.c--builtin_compile_impl
  if is AST object:
    # Convert AST object to AST node.
    ast.c--PyAST_obj2mod

    # Compile AST node to code object.
    compile.c--PyAST_CompileObject...(5FZWJ)
  else:
    # Compile string to AST object or code object.
    pythonrun.c--Py_CompileStringObject...(7CPPY)


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

      # Read code object from the read buffer.
      marshal.c--PyMarshal_ReadObjectFromString

        marshal.c--r_object
    else:
      # Read code object from the file.
      marshal.c--PyMarshal_ReadObjectFromFile

        marshal.c--r_object

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
```
