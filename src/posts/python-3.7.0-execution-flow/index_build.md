--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python 3.7.0 execution flow

author: Aoik

create_time: 2019-03-26 20:00:00

tags:
    - python
    - execution-flow
    - source-code-study
    - 吸星大法强吃源码

post_id: 18

$template:
    file: root://src/posts/_base/post_page_base_no_highlight.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python 3.7.0 execution flow
```
python.c--wmain

  main.c--Py_Main

    main.c--pymain_main

      main.c--pymain_init

      main.c--pymain_cmdline

      main.c--pymain_init_stdio

      pylifecycle.c--_Py_InitializeCore

        pylifecycle.c--_PyRuntime_Initialize

        obmalloc.c--_PyMem_SetupAllocators

        bootstrap_hash.c--_Py_HashRandomization_Init

        pystate.c--_PyInterpreterState_Enable

        pystate.c--PyInterpreterState_New

        pylifecycle.c--_PyCoreConfig_Copy

        pystate.c--PyThreadState_New

        pystate.c--PyThreadState_Swap

        ceval.c--_PyEval_FiniThreads

        pystate.c--_PyGILState_Init

        ceval.c--PyEval_InitThreads

        object.c--_Py_ReadyTypes

        frameobject.c--_PyFrame_Init

        longobject.c--_PyLong_Init

        bytearrayobject.c--PyByteArray_Init

        floatobject.c--_PyFloat_Init

        PyObject *modules = PyDict_New()

        sysmodule.c--_PySys_BeginInit

        interp->sysdict = PyModule_GetDict(sysmod)

        PyDict_SetItemString(interp->sysdict, "modules", modules)

        import.c--_PyImport_FixupBuiltin

        unicodeobject.c--_PyUnicode_Init

        structseq.c--_PyStructSequence_Init

        bltinmodule.c--_PyBuiltin_Init

        import.c--_PyImport_FixupBuiltin

        interp->builtins = PyModule_GetDict(bimod)

        exceptions.c--_PyExc_Init

        pstderr = PyFile_NewStdPrinter(fileno(stderr))

        _PySys_SetObjectId(&PyId_stderr, pstderr)

        PySys_SetObject("__stderr__", pstderr)

        import.c--_PyImport_Init

        import.c--_PyImportHooks_Init

        _warnings.c--_PyWarnings_Init

        context.c--_PyContext_Init

        pylifecycle.c--initimport

      main.c--pymain_init_python_main

        pystate.h--_PyMainInterpreterConfig_INIT

        main.c--_PyMainInterpreterConfig_Read

        pylifecycle.c--_Py_InitializeMainInterpreter

        main.c--_PyMainInterpreterConfig_Clear

      main.c--pymain_init_sys_path

      main.c--pymain_run_python

        main.c--pymain_header

        main.c--pymain_import_readline

        # OR-START
        main.c--pymain_run_command

        # OR
        main.c--pymain_run_module

        # OR
        main.c--pymain_run_filename...(2CMFT)
        # OR-END

        main.c--pymain_repl


# 2CMFT
main.c--pymain_run_filename
  main.c--pymain_run_startup

  main.c--pymain_run_interactive_hook

  main.c--pymain_run_main_from_importer

  main.c--pymain_open_filename

  main.c--pymain_run_file

    ceval.c--Py_MakePendingCalls

    pythonrun.c--PyRun_AnyFileExFlags

      pythonrun.c--PyRun_InteractiveLoopFlags

      pythonrun.c--PyRun_SimpleFileExFlags

        import.c--PyImport_AddModule

        # OR-START
        pythonrun.c--set_main_loader(d, filename, "SourcelessFileLoader")

        pythonrun.c--run_pyc_file

        # OR
        pythonrun.c--set_main_loader(d, filename, "SourceFileLoader")

        pythonrun.c--PyRun_FileExFlags...(5CDIU)
        # OR-END


# 5CDIU
pythonrun.c--PyRun_FileExFlags

  pyarena.c--PyArena_New

  # Parse source code into an AST node.
  pythonrun.c--PyParser_ASTFromFileObject

    parsetok.c--PyParser_ParseFileObject

      tokenizer.c--PyTokenizer_FromFile

      parsetok.c--parsetok

        parser.c--PyParser_New

          acceler.c--PyGrammar_AddAccelerators

          ps->p_grammar = g

          ps->p_tree = PyNode_New(start)

          s_reset(&ps->p_stack)

          s_push(&ps->p_stack, PyGrammar_FindDFA(g, start), ps->p_tree)

        # DFA state transition happens inside this function.
        parser.c--PyParser_AddToken

    ast.c--PyAST_FromNodeObject

  pythonrun.c--run_mod

    # Compile AST into bytecode.
    compile.c--PyAST_CompileObject

      compile.c--compiler_init

      future.c--PyFuture_FromASTObject

      ast_opt.c--_PyAST_Optimize

      symtable.c--PySymtable_BuildObject

      compile.c--compiler_mod

        compile.c--compiler_enter_scope

        compile.c--compiler_body

          asdl.h--asdl_seq_GET

          compile.c--VISIT(c, expr, st->v.Expr.value)

          compile.c--VISIT(c, stmt, (stmt_ty)asdl_seq_GET(stmts, i))

        compile.c--assemble

        compile.c--compiler_exit_scope

    # Run bytecode.
    ceval.c--PyEval_EvalCode

      ceval.c--PyEval_EvalCodeEx

        ceval.c--_PyEval_EvalCodeWithName
```
