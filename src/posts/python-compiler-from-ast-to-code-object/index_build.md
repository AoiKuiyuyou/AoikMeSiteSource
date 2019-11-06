--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python's compiler - from AST to code object

author: Aoik

create_time: 2019-11-03 20:00:00

tags:
    - python
    - compiler
    - ast
    - code-object
    - source-code-study
    - 吸星大法强吃源码

post_id: 52

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python's compiler - from AST to code object
**Python's compiler series:**
- [Python 3.8.0 execution flow](/blog/posts/python-3.8.0-execution-flow)
- [Python's compiler - from grammar to DFA](/blog/posts/python-compiler-from-grammar-to-dfa)
- [Python's compiler - the grammar file is not LL(1) but the parser is](/blog/posts/python-compiler-the-grammar-file-is-not-ll1-but-the-parser-is)
- [Python's compiler - from tokens to CST](/blog/posts/python-compiler-from-tokens-to-cst)
- [Python's compiler - from CST to AST](/blog/posts/python-compiler-from-cst-to-ast)
- [Python's compiler - from AST to code object](/blog/posts/python-compiler-from-ast-to-code-object)
- [Python's compiler - from code object to pyc file](/blog/posts/python-compiler-from-code-object-to-pyc-file)

\
[Python/compile.c::PyAST_CompileObject](https://github.com/python/cpython/blob/v3.8.0/Python/compile.c#L312) compiles AST node to code object.

First, [Python/symtable.c::PySymtable_BuildObject](https://github.com/python/cpython/blob/v3.8.0/Python/symtable.c#L262) builds a symbol table from the AST. The
symbol table stores the scope type of each name symbol in each code block.

Then [Python/compile.c::compiler_mod](https://github.com/python/cpython/blob/v3.8.0/Python/compile.c#L1782) visits each node in the AST to emit bytecode, and creates
a code object in the end.

The execution flow:
````
# ----- 5FZWJ -----
# Compile AST node to code object.
compile.c--PyAST_CompileObject

  compile.c--compiler_init

  future.c--PyFuture_FromASTObject

    future.c--future_parse

  # Optimize AST.
  ast_opt.c--_PyAST_Optimize..(3XQGF)

  # Build symbol table.
  symtable.c--PySymtable_BuildObject..(63ZYP)

  # Emit bytecode and create code object.
  compile.c--compiler_mod..(7CHWS)


# ----- 3XQGF -----
# Optimize AST.
ast_opt.c--_PyAST_Optimize

  ast_opt.c--astfold_mod

    switch on AST node type
    case Module_kind:
      ast_opt.c--astfold_body

    case Interactive_kind:
      ast_opt.c--astfold_stmt

    case Expression_kind:
      ast_opt.c--astfold_expr
        switch on AST node type
        case BinOp_kind:
          ast_opt.c--fold_binop
            # E.g. 1 + 2 -> 3

    case Suite_kind:
      ast_opt.c--astfold_stmt


# ----- 63ZYP -----
# Build symbol table.
symtable.c--PySymtable_BuildObject

  symtable.c--symtable_new

  symtable.c--symtable_enter_block..(2THN6)

  # Use the starting STE as top STE.
  st->st_top = st->st_cur;

  switch on AST node type
  case Module_kind:
    symtable.c--symtable_visit_stmt..(3JFQP)

  case Expression_kind:
    symtable.c--symtable_visit_expr..(2HWSA)

  case Interactive_kind:
    symtable.c--symtable_visit_stmt..(3JFQP)

  symtable.c--symtable_exit_block..(3YZZ1)

  symtable.c--symtable_analyze..(6IAAL)


# ----- 2THN6 -----
symtable.c--symtable_enter_block

  symtable.c--ste_new
    # `key` is the AST node.
    k = PyLong_FromVoidPtr(key);

    # Create STE.
    ste = PyObject_New(PySTEntryObject, &PySTEntry_Type)

    ste->ste_table = st

    # Used as key into `st->st_blocks`.
    ste->ste_id = k

    # Store the mapping from AST node key to STE.
    PyDict_SetItem(st->st_blocks, ste->ste_id, (PyObject *)ste)

  # Push new STE to stack.
  PyList_Append(st->st_stack, (PyObject *)ste)

  # Get previous STE.
  prev = st->st_cur;

  # Set new current STE.
  st->st_cur = ste;

  if the block is module block:
    # Use the module's symbols as global symbols.
    st->st_global = st->st_cur->ste_symbols;

  if have previous STE:
    # Add current STE as previous STE's child.
    PyList_Append(prev->ste_children, (PyObject *)ste)


# ----- 3YZZ1 -----
symtable.c--symtable_exit_block

  # Pop current STE off stack.
  PyList_SetSlice(st->st_stack, size - 1, size, NULL)

  # Set previous STE as new current STE.
  st->st_cur = (PySTEntryObject *)PyList_GET_ITEM(st->st_stack, size - 1)


# ----- 3JFQP -----
symtable.c--symtable_visit_stmt

  switch on node type:
  case FunctionDef_kind:
    VISIT_SEQ(st, expr, s->v.FunctionDef.args->defaults);
    VISIT_SEQ_WITH_NULL(st, expr, s->v.FunctionDef.args->kw_defaults);
    symtable.c--symtable_visit_annotations
    VISIT_SEQ(st, expr, s->v.FunctionDef.decorator_list);
    symtable.c--symtable_enter_block
    VISIT(st, arguments, s->v.FunctionDef.args);
    VISIT_SEQ(st, stmt, s->v.FunctionDef.body);
    symtable.c--symtable_exit_block

  case ClassDef_kind:
    symtable.c--symtable_add_def
    VISIT_SEQ(st, expr, s->v.ClassDef.bases);
    VISIT_SEQ(st, keyword, s->v.ClassDef.keywords);
    VISIT_SEQ(st, expr, s->v.ClassDef.decorator_list);
    symtable.c--symtable_enter_block
    VISIT_SEQ(st, stmt, s->v.ClassDef.body);
    symtable.c--symtable_exit_block


# ----- 2HWSA -----
symtable.c--symtable_visit_expr
  switch on AST node type
  case Name_kind:
    # symtable.c--symtable_add_def..(7ZKQ4)
    symtable_add_def(
      st, e->v.Name.id,
      e->v.Name.ctx == Load ? USE : DEF_LOCAL
    )

    if (e->v.Name.ctx == Load &&
        st->st_cur->ste_type == FunctionBlock &&
        _PyUnicode_EqualToASCIIString(e->v.Name.id, "super")) {
        symtable_add_def(st, __class__, USE)
    }


# ----- 7ZKQ4 -----
symtable.c--symtable_add_def

  symtable.c--symtable_add_def_helper
    mangled = _Py_Mangle(st->st_private, name)

    dict = ste->ste_symbols;

    PyDict_SetItem(dict, mangled, o)

    if (flag & DEF_PARAM) {
        PyList_Append(ste->ste_varnames, mangled)
    } else if (flag & DEF_GLOBAL) {
        PyDict_SetItem(st->st_global, mangled, o)
    }


# ----- 6IAAL -----
symtable.c--symtable_analyze

  # Create `free` set.

  # Create `global` set.

  symtable.c--analyze_block..(5VUKP)


# ----- 5VUKP -----
symtable.c--analyze_block
  # Argument `ste`: current symtable entry (input/output)
  # Argument `bound`: set of bound names in enclosing blocks (input).
  # NULL for module blocks.
  # Argument `free`: set of free names in child blocks (output).
  # Argument `globals`: set of declared global names in enclosing blocks (input).

  # Create `local` set for new names bound in current block.

  # Create `scopes` dict that maps symbol name to scope type.

  # Create `newglobal` set to be visible in enclosed blocks.

  # Create `newfree` set.

  # Create `newbound` set to be visible in enclosed blocks.

  /* Class namespace has no effect on names visible in
     nested functions, so populate the global and bound
     sets to be passed to child blocks before analyzing
     this one.
   */
  if current block is class block:
      # Use enclosing block' global set.
      # So current block does not add anything to it.
      newglobal |= global

      # Use enclosing block' bound set.
      # So current block does not add anything to it.
      newbound |= bound

  for each symbol name in `ste->ste_symbols`:
    # Store each symbol name's scope type in `scopes`.
    # Current block's symbol names are added to `local`, `free`, `global`.
    symtable.c--analyze_name..(6W6VV)

  if current block is not class block:
      if current block is function block:
          # Module block's names are not to be visible as bound names to child
          # blocks. Uses of these names will be given scope type
          # GLOBAL_IMPLICIT.
          newbound |= local

      newbound |= bound

      newglobal |= global
  else:
      # To support `super()`.
      PySet_Add(newbound, __class__)

  # Create `allfree` set.

  for each child STE:
    # In `analyze_child_block`, a copy of `newfree` will be used as the
    # starting free names set. `newfree` is empty so the starting free names
    # set is empty. The child block's free names set after analysis will be
    # added to `allfree`.
    symtable.c--analyze_child_block..(6JYZB)
    ```
    analyze_child_block(entry, newbound, newfree, newglobal,
                               allfree)
    ```

  # Now `newfree` contains child blocks' free names.
  newfree |= allfree

  if current block is function block:
    symtable.c--analyze_cells..(5MJYX)
    ```
    analyze_cells(scopes, newfree)
    ```
  elif current block is class block:
    symtable.c--drop_class_free..(6P3G2)
    ```
    drop_class_free(ste, newfree)
    ```

  symtable.c--update_symbols..(3DWGU)
  ```
  update_symbols(ste->ste_symbols, scopes, bound, newfree,
                      ste->ste_type == ClassBlock)
  ```

  # Now `free` contains enclosing, current, and child blocks' free names.
  free |= newfree


# ----- 6JYZB -----
symtable.c--analyze_child_block
  temp_bound = PySet_New(bound)
  temp_free = PySet_New(free)
  temp_global = PySet_New(global)
  # symtable.c--analyze_block..(5VUKP)
  analyze_block(entry, temp_bound, temp_free, temp_global)
  child_free |= temp_free


# ----- 6W6VV -----
# Store each symbol name's scope type in `scopes`.
# Current block's symbol names are added to `local`, `free`, `global`.
symtable.c--analyze_name
  if (flags & DEF_GLOBAL) {
      if (flags & DEF_NONLOCAL) {
          PyErr_Format(PyExc_SyntaxError,
                       "name '%U' is nonlocal and global",
                       name);
          return error_at_directive(ste, name);
      }
      SET_SCOPE(scopes, name, GLOBAL_EXPLICIT);
      if (PySet_Add(global, name) < 0)
          return 0;
      if (bound && (PySet_Discard(bound, name) < 0))
          return 0;
      return 1;
  }
  if (flags & DEF_NONLOCAL) {
      if (!bound) {
          PyErr_Format(PyExc_SyntaxError,
                       "nonlocal declaration not allowed at module level");
          return error_at_directive(ste, name);
      }
      if (!PySet_Contains(bound, name)) {
          PyErr_Format(PyExc_SyntaxError,
                       "no binding for nonlocal '%U' found",
                       name);

          return error_at_directive(ste, name);
      }
      SET_SCOPE(scopes, name, FREE);
      ste->ste_free = 1;
      return PySet_Add(free, name) >= 0;
  }
  if (flags & DEF_BOUND) {
      SET_SCOPE(scopes, name, LOCAL);
      if (PySet_Add(local, name) < 0)
          return 0;
      if (PySet_Discard(global, name) < 0)
          return 0;
      return 1;
  }
  /* If an enclosing block has a binding for this name, it
     is a free variable rather than a global variable.
     Note that having a non-NULL bound implies that the block
     is nested.
  */
  if (bound && PySet_Contains(bound, name)) {
      SET_SCOPE(scopes, name, FREE);
      ste->ste_free = 1;
      return PySet_Add(free, name) >= 0;
  }
  /* If a parent has a global statement, then call it global
     explicit?  It could also be global implicit.
   */
  if (global && PySet_Contains(global, name)) {
      SET_SCOPE(scopes, name, GLOBAL_IMPLICIT);
      return 1;
  }
  if (ste->ste_nested)
      ste->ste_free = 1;
  SET_SCOPE(scopes, name, GLOBAL_IMPLICIT);
  return 1;


# ----- 5MJYX -----
symtable.c--analyze_cells
  for each symbol name in `scopes`:
    if the scope type is LOCAL:
      if the name is in child blocks' free set:
        # Set the name's scope type to be CELL.

        # Remove the name from the free set.


# ----- 6P3G2 -----
symtable.c--drop_class_free
  # Remove the `__class__` name from child blocks' free set.

  if the `__class__` name existed:
    ste->ste_needs_class_closure = 1


# ----- 3DWGU -----
symtable.c--update_symbols
  for current block's each symbol name:
    # Add the name's scope value in `scopes` to the flags in `symbols`.

  for each symbol name in child blocks' free name sets:
    # Find the free name in current block's `symbols`.
    v = PyDict_GetItemWithError(symbols, name);

    # If the free name exists in current block's `symbols`.
    if (v) {
        /* Handle a free variable in a method of
           the class that has the same name as a local
           or global in the class scope.
        */
        # If current block is class block and the name is bound or global.
        # Notice class block's names are not visible to child blocks,
        # so the name is bound in an enclosing function block of the class.
        # E.g.
        # ```
        # def f():
        #     a = 1
        #     class A():
        #         a = 2
        #         def g():
        #             return a
        #     return A
        # A = f()
        # assert A.g() == 1
        # ```
        if  (classflag &&
             PyLong_AS_LONG(v) & (DEF_BOUND | DEF_GLOBAL)) {

            # Add `DEF_FREE_CLASS` to the flags.
            long flags = PyLong_AS_LONG(v) | DEF_FREE_CLASS;
            v_new = PyLong_FromLong(flags);
            PyDict_SetItem(symbols, name, v_new)
        }
        /* It's a cell, or already free in this scope */
        continue;
    }
    else if (PyErr_Occurred()) {
        goto error;
    }
    /* Handle global symbol */
    if (bound && !PySet_Contains(bound, name)) {
        continue;       /* it's a global */
    }
    /* Propagate new free symbol up the lexical stack */
    # E.g. `g` implicitly uses free name `a` because child block `h` uses `a`.
    # ```
    # def f():
    #     a = 1
    #     def g():
    #         def h():
    #             return a
    # ```
    PyDict_SetItem(symbols, name, v_free)


# ----- 7CHWS -----
# Emit bytecode and create code object.
compile.c--compiler_mod

  compile.c--compiler_enter_scope..(5E13Z)

  switch on AST node type
  case Module_kind:
    compile.c--compiler_body
      for each statement in AST node:
        compile.c--compiler_visit_stmt..(7C0ZR)

  case Interactive_kind:
    c->c_interactive = 1
    VISIT_SEQ_IN_SCOPE(c, stmt, mod->v.Interactive.body)
      for each statement in AST node:
        compile.c--compiler_visit_stmt..(7C0ZR)

  case Expression_kind:
    VISIT_IN_SCOPE(c, expr, mod->v.Expression.body)
      compile.c--compiler_visit_expr..(3FCOE)

  # Create code object.
  compile.c--assemble..(3LDD9)

  compile.c--compiler_exit_scope..(2PQFC)


# ----- 5E13Z -----
compile.c--compiler_enter_scope

  # Create `compiler_unit`.

  # Find the STE for the AST node.
  u->u_ste = PySymtable_Lookup(c->c_st, key);

  # Get the mapping from function parameter names to their index in `ste_varnames`.
  u->u_varnames = list2dict(u->u_ste->ste_varnames);

  # Get the mapping from cell names to their sorted index.
  u->u_cellvars = dictbytype(u->u_ste->ste_symbols, CELL, 0, 0);

  if ste_needs_class_closure is on {
    Add `__class__` to `u->u_cellvars` as the only cell variable.
  }

  # Get the mapping from free names to their sorted index.
  # The starting index is `PyDict_GET_SIZE(u->u_cellvars)` so that free
  # variables come after cell variables.
  u->u_freevars = dictbytype(u->u_ste->ste_symbols, FREE, DEF_FREE_CLASS, PyDict_GET_SIZE(u->u_cellvars));

  # Create constant objects dict.
  u->u_consts = PyDict_New();

  # Create all names dict.
  u->u_names = PyDict_New();

  if have current compiler unit:
    # capsule.c--PyCapsule_New
    capsule = PyCapsule_New

    PyList_Append(c->c_stack, capsule)

    u->u_private = c->u->u_private;

  # Set the new current compiler unit.
  c->u = u

  c->c_nestlevel++

  # Create basicblock.
  block = compiler_new_block(c);

    u = c->u;

    b = (basicblock *)PyObject_Malloc(sizeof(basicblock));

    # Point the new `basicblock`'s `b_list` to previous `basicblock`.
    b->b_list = u->u_blocks;

    # Point the compiler unit's `u_blocks` to the new `basicblock`.
    u->u_blocks = b;

  # Set the new current `basicblock`.
  c->u->u_curblock = block;

  if the scope type is not COMPILER_SCOPE_MODULE:
    compile.c--compiler_set_qualname


# ----- 6PFS7 -----
compiler.c--dictbytype
  /* Sort the keys so that we have a deterministic order on the indexes
     saved in the returned dictionary.  These indexes are used as indexes
     into the free and cell var storage.  Therefore if they aren't
     deterministic, then the generated bytecode is not deterministic.
  */
  sorted_keys = PyDict_Keys(src);

  PyList_Sort(sorted_keys)

  for each symbol name in the symbol flags dict:
    if scope type matches or flag matches:
      # Store in the result dict the mapping from the symbol name to the
      # sorted index.


# ----- 2PQFC -----
compile.c--compiler_exit_scope
  c->c_nestlevel--

  compile.c--compiler_unit_free

  # Set the new current compiler unit `c->u`.


# ----- 7C0ZR -----
compile.c--compiler_visit_stmt

  switch on AST node type
  case FunctionDef_kind
    compile.c--compiler_function
      compile.c--assemble..(3LDD9)

      compile.c--compiler_make_closure..(2VZ9S)

      # compile.c--compiler_nameop..(7TFBR)
      compiler_nameop(c, name, Store)

  case ClassDef_kind
    compile.c--compiler_class
      compile.c--assemble..(3LDD9)


# ----- 2VZ9S -----
compile.c--compiler_make_closure
  if have free names:
    for each free name:
      reftype = get_ref_type(c, name)

      if (reftype == CELL)
          arg = compiler_lookup_arg(c->u->u_cellvars, name)
      else /* (reftype == FREE) */
          arg = compiler_lookup_arg(c->u->u_freevars, name)

      ADDOP_I(c, LOAD_CLOSURE, arg)

    flags |= 0x08;

    ADDOP_I(c, BUILD_TUPLE, free)

  # compile.c--ADDOP_LOAD_CONST..(5OUDE)
  ADDOP_LOAD_CONST(c, (PyObject*)co)

  ADDOP_LOAD_CONST(c, qualname)

  ADDOP_I(c, MAKE_FUNCTION, flags)


# ----- 5OUDE -----
compile.c--ADDOP_LOAD_CONST

  compile.c--compiler_addop_load_const

    # compile.c--compiler_add_const..(5XEK7)
    arg = compiler_add_const(c, o)

    # compile.c--compiler_addop_i..(2ABPQ)
    compiler_addop_i(c, LOAD_CONST, arg)


# ----- 5XEK7 -----
# Add a constant object to `c->u->u_consts`.
compile.c--compiler_add_const

  key = merge_consts_recursive(c, o)

  compile.c--compiler_add_o..(7XORR)



# ----- 7XORR -----
compile.c--compiler_add_o

  # Store the mapping from `key` to index.


# ----- 2ABPQ -----
compile.c--compiler_addop_i
  # Get next instruction's offset.
  # compile.c--compiler_next_instr..(5XZHW)
  off = compiler_next_instr(c, c->u->u_curblock);

  # Get the instruction struct.
  i = &c->u->u_curblock->b_instr[off];

  # Set the opcode.
  i->i_opcode = opcode;

  # Set the oparg.
  i->i_oparg = Py_SAFE_DOWNCAST(oparg, Py_ssize_t, int);

  # Set line number.
  compiler_set_lineno(c, off);


# ----- 5XZHW -----
# Get next instruction's offset.
compile.c--compiler_next_instr

  # Resize instructions array if needed.

  # Return next instruction's offset.
  b->b_iused++


# ----- 3FCOE -----
compile.c--compiler_visit_expr..(3FCOE)
  # Set new line and column numbers.

  compile.c--compiler_visit_expr1..(5ME7U)

  # Restore old line and column numbers.


# ----- 5ME7U -----
compile.c--compiler_visit_expr1
  switch on AST node type
  case Name_kind:
    compile.c--compiler_nameop..(7TFBR)

  case Lambda_kind:
    compile.c--compiler_lambda

  case GeneratorExp_kind:
    compile.c--compiler_genexp
      compile.c--compiler_comprehension
        compile.c--assemble..(3LDD9)

  case ListComp_kind:
    compile.c--compiler_listcomp
      compile.c--compiler_comprehension
        compile.c--assemble..(3LDD9)

  case SetComp_kind:
    compile.c--compiler_setcomp
      compile.c--compiler_comprehension
        compile.c--assemble..(3LDD9)

  case DictComp_kind:
    compile.c--compiler_dictcomp
      compile.c--compiler_comprehension
        compile.c--assemble..(3LDD9)


# ----- 7TFBR -----
compile.c--compiler_nameop
  mangled = _Py_Mangle(c->u->u_private, name);

  scope = PyST_GetScope(c->u->u_ste, mangled);

  switch (scope) {
  case FREE:
      dict = c->u->u_freevars;
      optype = OP_DEREF;
      break;
  case CELL:
      dict = c->u->u_cellvars;
      optype = OP_DEREF;
      break;
  case LOCAL:
      if (c->u->u_ste->ste_type == FunctionBlock)
          optype = OP_FAST;
      break;
  case GLOBAL_IMPLICIT:
      if (c->u->u_ste->ste_type == FunctionBlock)
          optype = OP_GLOBAL;
      break;
  case GLOBAL_EXPLICIT:
      optype = OP_GLOBAL;
      break;
  default:
      /* scope can be 0 */
      break;
  }

  switch (optype) {
  case OP_DEREF:
      switch (ctx) {
      case Load:
          op = (c->u->u_ste->ste_type == ClassBlock) ? LOAD_CLASSDEREF : LOAD_DEREF;
          break;
      case Store:
          op = STORE_DEREF;
          break;
      case AugLoad:
      case AugStore:
          break;
      case Del: op = DELETE_DEREF; break;
      case Param:
      default:
          PyErr_SetString(PyExc_SystemError,
                          "param invalid for deref variable");
          return 0;
      }
      break;
  case OP_FAST:
      switch (ctx) {
      case Load: op = LOAD_FAST; break;
      case Store:
          op = STORE_FAST;
          break;
      case Del: op = DELETE_FAST; break;
      case AugLoad:
      case AugStore:
          break;
      case Param:
      default:
          PyErr_SetString(PyExc_SystemError,
                          "param invalid for local variable");
          return 0;
      }
      ADDOP_N(c, op, mangled, varnames);
      return 1;
  case OP_GLOBAL:
      switch (ctx) {
      case Load: op = LOAD_GLOBAL; break;
      case Store:
          op = STORE_GLOBAL;
          break;
      case Del: op = DELETE_GLOBAL; break;
      case AugLoad:
      case AugStore:
          break;
      case Param:
      default:
          PyErr_SetString(PyExc_SystemError,
                          "param invalid for global variable");
          return 0;
      }
      break;
  case OP_NAME:
      switch (ctx) {
      case Load: op = LOAD_NAME; break;
      case Store:
          op = STORE_NAME;
          break;
      case Del: op = DELETE_NAME; break;
      case AugLoad:
      case AugStore:
          break;
      case Param:
      default:
          PyErr_SetString(PyExc_SystemError,
                          "param invalid for name variable");
          return 0;
      }
      break;
  }

  # compile.c--compiler_add_o..(7XORR)
  arg = compiler_add_o(c, dict, mangled)

  # compile.c--compiler_addop_i..(2ABPQ)
  compiler_addop_i(c, op, arg)


# ----- 3LDD9 -----
# Create code object.
compile.c--assemble
  if (!c->u->u_curblock->b_return) {
      NEXT_BLOCK(c);
        compiler_next_block
          compiler_new_block
            c->u->u_curblock->b_next = block;
            c->u->u_curblock = block;
      if (addNone)
          ADDOP_LOAD_CONST(c, Py_None);
      ADDOP(c, RETURN_VALUE);
  }

  # Get entry block and blocks count.

  # Set `c->u->u_firstlineno`.

  compile.c--assemble_init
  ```
  assemble_init(&a, nblocks, c->u->u_firstlineno)
  ```
    a->a_bytecode = PyBytes_FromStringAndSize(NULL, DEFAULT_CODE_SIZE)

    a->a_lnotab = PyBytes_FromStringAndSize(NULL, DEFAULT_LNOTAB_SIZE)

    a->a_postorder = (basicblock **)PyObject_Malloc(
                                        sizeof(basicblock *) * nblocks);

  # Sort blocks in DFS postorder.
  compile.c--dfs..(2KCRZ)

  # Set jump offsets.
  compile.c--assemble_jump_offsets..(6BEOL)

  for each block in DFS reverse postorder:
    for the block's each instruction:
      # Emit bytecode.
      compile.c--assemble_emit..(3D2A6)

  # Resize line number table to just fit.

  # Resize bytecode array to just fit.

  # Create code object.
  compile.c--makecode..(61S2D)


# ----- 2KCRZ -----
Sort blocks in DFS postorder.

static void
dfs(struct compiler *c, basicblock *b, struct assembler *a, int end)
{
    int i, j;

    /* Get rid of recursion for normal control flow.
       Since the number of blocks is limited, unused space in a_postorder
       (from a_nblocks to end) can be used as a stack for still not ordered
       blocks. */
    for (j = end; b && !b->b_seen; b = b->b_next) {
        b->b_seen = 1;
        assert(a->a_nblocks < j);
        a->a_postorder[--j] = b;
    }
    while (j < end) {
        b = a->a_postorder[j++];
        for (i = 0; i < b->b_iused; i++) {
            struct instr *instr = &b->b_instr[i];
            if (instr->i_jrel || instr->i_jabs)
                dfs(c, instr->i_target, a, j);
        }
        assert(a->a_nblocks < j);
        a->a_postorder[a->a_nblocks++] = b;
    }
}


# ----- 6BEOL -----
# Set jump offsets.
compile.c--assemble_jump_offsets

  do-while extended_arg_recompile:
    totsize = 0;
    # For each block in DFS reverse postorder.
    for (i = a->a_nblocks - 1; i >= 0; i--) {
        # Get the block.
        b = a->a_postorder[i];

        # Get the block's size.
        bsize = blocksize(b);

        # Set the block's starting instruction offset.
        b->b_offset = totsize;

        # Get the next block's starting instruction offset.
        totsize += bsize;
    }

    # Set off the recomputing flag.
    extended_arg_recompile = 0;

    # For each block.
    for (b = c->u->u_blocks; b != NULL; b = b->b_list) {
        # Get the block's instruction offset.
        bsize = b->b_offset;

        # For the block's each instruction.
        for (i = 0; i < b->b_iused; i++) {
            # Get the instruction.
            struct instr *instr = &b->b_instr[i];

            # Get the instruction's oparg size.
            int isize = instrsize(instr->i_oparg);

            /* Relative jumps are computed relative to
               the instruction pointer after fetching
               the jump instruction.
            */
            # Get the next instruction's offset.
            bsize += isize;

            # If the instruction is jump.
            if (instr->i_jabs || instr->i_jrel) {
                # Get the target block's offset.
                instr->i_oparg = instr->i_target->b_offset;

                # If the instruction is relative jump.
                if (instr->i_jrel) {
                    # Set the jump's offset.
                    instr->i_oparg -= bsize;
                }

                # Set the jump's byte offset.
                instr->i_oparg *= sizeof(_Py_CODEUNIT);

                # If the oparg size changes,
                # it means the block's size changes,
                # which affects the starting offset of following blocks,
                # so recomputing is needed.
                if (instrsize(instr->i_oparg) != isize) {
                    # Set on the recomputing flag.
                    extended_arg_recompile = 1;
                }
            }
        }
    }


# ----- 3D2A6 -----
# Emit bytecode.
compile.c--assemble_emit..(3D2A6)

  compile.c--assemble_lnotab

  # Get instructions count considering EXTENDED_ARG.
  size = instrsize(arg);

  # Resize the bytecode buffer if needed.

  # Get the write position of the bytecode buffer.
  code = (_Py_CODEUNIT *)PyBytes_AS_STRING(a->a_bytecode) + a->a_offset;

  # Get the write position of the next instruction.
  a->a_offset += size;

  # Write bytecode for the instruction.
  wordcode_helpers.h--write_op_arg..(2VYIO)


# ----- 2VYIO -----
wordcode_helpers.h--write_op_arg
  switch on oparg length:
    case 4:
      *codestr++ = PACKOPARG(EXTENDED_ARG, (oparg >> 24) & 0xff);
      /* fall through */
    case 3:
      *codestr++ = PACKOPARG(EXTENDED_ARG, (oparg >> 16) & 0xff);
      /* fall through */
    case 2:
      *codestr++ = PACKOPARG(EXTENDED_ARG, (oparg >> 8) & 0xff);
      /* fall through */
    case 1:
      *codestr++ = PACKOPARG(opcode, oparg & 0xff);


# ----- 61S2D -----
# Create code object.
compile.c--makecode

  # Get constants list.
  consts_dict_keys_inorder(c->u->u_consts)

  # Get all names list.
  names = dict_keys_inorder(c->u->u_names, 0)

  # Get local names list.
  varnames = dict_keys_inorder(c->u->u_varnames, 0);

  # Get cell names list.
  cellvars = dict_keys_inorder(c->u->u_cellvars, 0);

  # Get free names list.
  freevars = dict_keys_inorder(c->u->u_freevars, PyTuple_GET_SIZE(cellvars))

  compile.c--merge_const_tuple..(3PHXW)
  ```
  merge_const_tuple(c, &names)

  merge_const_tuple(c, &varnames)

  merge_const_tuple(c, &cellvars)

  merge_const_tuple(c, &freevars)
  ```

  compile.c--compute_code_flags

  peephole.c--PyCode_Optimize

  # Convert `consts` to tuple.

  compile.c--merge_const_tuple..(3PHXW)
  merge_const_tuple(c, &consts)

  # Get max stack depth.
  compile.c--stackdepth

  # Create code object.
  codeobject.c--PyCode_NewWithPosOnlyArgs..(6DQ7T)


# ----- 3PHXW -----
compile.c--merge_const_tuple
  key = codeobject.c--_PyCode_ConstantKey

  PyDict_SetDefault(c->c_const_cache, key, key)

  if the key is new:
    return 1

  # Get the cached value.
  PyObject *u = PyTuple_GET_ITEM(t, 1);

  # Point to the cached value.
  *tuple = u;


# ----- 6DQ7T -----
codeobject.c--PyCode_NewWithPosOnlyArgs
  codeobject.c--intern_strings
  ```
  intern_strings(names);
  intern_strings(varnames);
  intern_strings(freevars);
  intern_strings(cellvars);
  ```

  codeobject.c--intern_string_constants
  ```
  intern_string_constants(consts);
  ```

  if have cell names:
    # Compute `cell2arg`.

    if `cell2arg` is not used:
      cell2arg = NULL
  }
  
  # code.h--PyCodeObject
  # codeobject.c--PyCode_Type
  PyObject_NEW(PyCodeObject, &PyCode_Type)
````
