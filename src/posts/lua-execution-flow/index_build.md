--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Lua execution flow

author: Aoik

create_time: 2019-03-22 20:00:00

tags:
    - lua
    - execution-flow
    - source-code-study
    - 吸星大法强吃源码

post_id: 14

$template:
    file: root://src/posts/_base/post_page_base_no_highlight.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Lua execution flow
Lua version 5.3.5.

```
lua.c--main

  lauxlib.c--luaL_newstate

    lstate.c--lua_newstate
    # Create lua_State and global_State.

      lstate.c--preinit_thread

      ldo.c--luaD_rawrunprotected...(2LSGL)
      # Store `L->nCcalls`, `L->errorJmp` before call, and restore afterwards.
      # Point `L->errorJmp` to a local lua_longjmp struct.
      # Call given function, `f_luaopen` in this case.
      # Return the error code in `L->errorJmp.status`.

        lstate.c--f_luaopen
        # Initialize the lua_State

          lstate.c--stack_init
          # Init `lua_State->stack`
          # Init `lua_State->ci`
          # Use `lua_State->base_ci` as `lua_State->ci`.

          lstate.c--init_registry
          # Initialize the lua_State's registry table

            ltable.c--luaH_new
            # Create table object

              lgc.c--luaC_newobj
              # Create GCObject object and add to `allgc` list

                lmem.h--luaM_newobject

                  lmem.c--luaM_realloc_
                  # Allocate memory block.

              ltable.c--setnodevector

            ltable.c--luaH_resize

            ltable.c--luaH_setint

          lstring.c--luaS_init
          # Initialize the lua_State's string table and the string cache.

            lstring.c--luaS_resize
            # Resize the lua_State's string table to initial size (128).

              lmem.h--luaM_reallocvector

                lmem.h--luaM_reallocv

                  lmem.c--luaM_realloc_

          lstring.c--luaT_init
          # Initialize the lua_State's tagged method names array.

          llex.c--luaX_init
          # Create reserved words strings in cache.

        # ===== lstate.c--f_luaopen =====

      # ===== ldo.c--luaD_rawrunprotected =====

    # ===== lstate.c--lua_newstate =====

    lapi.c--lua_atpanic
    # Set global state's panic function.

  # ===== lauxlib.c--luaL_newstate =====

  lua.h--lua_pushcfunction (macro)
  # Push `pmain` to stack.

    lapi.c--lua_pushcclosure

  lapi.c--lua_pushinteger
  # Push `argc` to stack.

  lapi.c--lua_pushlightuserdata
  # Push `argv` to stack.

  lua.h--lua_pcall

    lapi.c--lua_pcallk
    # The target function `pmain` to call and its arguments are expected to be
    # pushed on stack. Call `f_call`, which in turn calls the target function
    # `pmain`.

      ldo.c--luaD_pcall
      # Store `L->ci`, `L->allowhook`, `L->nny`, `L->errfunc` before call
      # `luaD_rawrunprotected`, which in turn calls given function.
      # If the status returned by `luaD_rawrunprotected` is not 0, restore
      # `L->ci`, `L->allowhook`, `L->nny`. Call `seterrorobj` to set error
      # message on `L->top - 1` to old stack top given.
      # Restore `L->errfunc`.

        ldo.c--luaD_rawrunprotected...(2LSGL)

          lua.c--pmain...(5MWJ5)

      # OR

      ldo.c--luaD_call...(60ZE7)
      # Call the function described in `L->ci`.

  lstate.c--lua_close
# ===== lua.c--main =====


# 2LSGL
ldo.c--luaD_rawrunprotected

  ldo.c--LUAI_TRY
  # `LUAI_TRY` calls `setjmp` to save current execution context to
  # `L->errorJmp->b` and then calls `(*f)(L, ud)`,
  # In case of error, execution can call `longjmp` with `L->errorJmp->b` to
  # jump back.

    lapi.c--f_call

      ldo.c--luaD_callnoyield

        ldo.c--luaD_call...(60ZE7)
# ===== ldo.c--luaD_rawrunprotected =====


# 60ZE7
ldo.c--luaD_call

  ldo.c--luaD_precall
  # If the function to call is a C closure or light C function,
  # call it. If it is a Lua function, leave it to `luaV_execute`.

    ldo.c--next_ci

    ldo.c--luaD_hook

    ldo.c--luaD_poscall

      ldo.c--moveresults

    # OR

    ldo.c--adjust_varargs

  lvm.c--luaV_execute (3UH1T)
  # Execute VM instructions.
# ===== ldo.c--luaD_call =====


# 5MWJ5
lua.c--pmain

  lua.c--collectargs

  linit.c--luaL_openlibs
  # Open standard libraries.

  lua.c--createargtable

    lapi.c--lua_createtable

      ltable.c--luaH_resize

    # 25GPR
    # Set global value `arg`.

  lua.c--handle_script

    lauxlib.h--luaL_loadfile

      lauxlib.c--luaL_loadfilex

        lapi.c--lua_load

          ldo.c--luaD_protectedparser

            ldo.c--luaD_pcall

              ldo.c--f_parser...(2OAT3)

          # At this point, the entry function is on stack at `L->top - 1`.

          # Set globals table as the first upvalue of the entry function.

    lua.c--pushargs
    # Push command line arguments to stack.
    # Return the number of command line arguments.

    lua.c--docall
      # Insert `msghandler` before the functon to be called.
      # Use it as error function.

      # Register signal handler `laction`.

      lua.h--lua_pcall...
      # Use `msghandler` as error function.

        # Go with the branch at 33NSM
        ldo.c--luaD_call...(60ZE7)

      # Restore default signal handler.
# ===== lua.c--pmain =====


# 2OAT3
ldo.c--f_parser

  lundump.c--luaU_undump
  # Parse bytecode to create Lua main function.

    lfunc.c--luaF_newLclosure

    lfunc.c--luaF_newproto

  # OR

  lparser.c--luaY_parser
  # Parse source code to create Lua main function.
    """
    LexState lexstate;

    FuncState funcstate;
    """

    lfunc.c--luaF_newLclosure
      """
      funcstate.f = cl->p = luaF_newproto(L);

      lexstate.buff = buff;

      lexstate.dyd = dyd;

      dyd->actvar.n = dyd->gt.n = dyd->label.n = 0;
      """

    # The Lua main function is set to stack top.
    """
    LClosure *cl = luaF_newLclosure(L, 1);  /* create main closure */
    setclLvalue(L, L->top, cl);  /* anchor it (to avoid being collected) */
    """

    llex.c--luaX_setinput
      """
      ls->envn = luaS_newliteral(L, LUA_ENV);
      """

    lparser.c--mainfunc
      """
      BlockCnt bl;

      expdesc v
      """

      lparser.c--open_func
      # Initialize `FuncState fs`.

      # Main function is vararg
      """
      fs->f->is_vararg = 1;
      """

      lparser.c--init_exp
      # Initialize `expdesc v`.

      lparser.c--newupvalue
        """
        newupvalue(fs, ls->envn, &v)
        """

      llex.c--luaX_next

        llex.c--llex

          llex.c--next

      lparser.c--statlist...(1TRNE)
      # Parse statements.
# ===== ldo.c--f_parser =====
```
