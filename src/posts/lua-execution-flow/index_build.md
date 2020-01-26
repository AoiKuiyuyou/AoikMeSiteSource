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

`````
# ----- lua.c--main (6NJXA) -----
# Main function.
#
int main (int argc, char **argv)

  # Create `lua_State` and `global_State`.
  lauxlib.c--luaL_newstate...(3OEVI)

  # Push function `pmain` to stack.
  lua.h--lua_pushcfunction

  # Push `argc` to stack.
  lapi.c--lua_pushinteger

  # Push `argv` to stack.
  lapi.c--lua_pushlightuserdata

  # Call function `pmain` on stack.
  lua.h--lua_pcall...(3GERF)

    lapi.c--lua_pcallk...(6YGT0)

      ldo.c--luaD_pcall...(3RVKZ)

        ldo.c--luaD_rawrunprotected...(2LSGL)

          ldo.c--LUAI_TRY...(6GUZS)

            ldo.c--luaD_callnoyield...(5SH0J)

              ldo.c--luaD_call...(60ZE7)

                lua.c--pmain...(5MWJ5)

  # Close `lua_State`.
  lstate.c--lua_close


# ----- lauxlib.c--luaL_newstate (3OEVI) -----
# Create `lua_State` and `global_State`.
#
lauxlib.c--luaL_newstate

  # Create a `LG` object containing a `lua_State` and a `global_State`.
  lstate.c--lua_newstate

    # Initialize `lua_State` fields.
    lstate.c--preinit_thread
      ```
      L->errorJmp = NULL;
      L->nCcalls = 0;
      ```

    # Call `lstate.c--f_luaopen`.
    ldo.c--luaD_rawrunprotected...(2LSGL)

      # Initialize the lua_State.
      lstate.c--f_luaopen

        # Initialize `lua_State->stack` and `lua_State->stacksize`.
        lstate.c--stack_init
        ```
        L1->stack = luaM_newvector(L, BASIC_STACK_SIZE, TValue);
        L1->stacksize = BASIC_STACK_SIZE;
        ```

        # Initialize `lua_State->stack_last`
        ```
        L1->stack_last = L1->stack + L1->stacksize - EXTRA_STACK;
        ```

        # Initialize `lua_State->ci`
        ```
        ci->func = L1->top;
        setnilvalue(L1->top++);
        ci->top = L1->top + LUA_MINSTACK;
        ```

        # Use `lua_State->base_ci` as `lua_State->ci`.
        ```
        ci = &L1->base_ci;
        L1->ci = ci;
        ```

        # Initialize the lua_State's registry table.
        lstate.c--init_registry

          ltable.c--luaH_new

          ltable.c--luaH_resize

          ltable.c--luaH_setint
          ```
          luaH_setint(L, registry, LUA_RIDX_MAINTHREAD, &temp);
          luaH_setint(L, registry, LUA_RIDX_GLOBALS, &temp);
          ```

        # Initialize the lua_State's string table and string cache.
        lstring.c--luaS_init

          # Resize the lua_State's string table to initial size 128.
          lstring.c--luaS_resize

        # Initialize the lua_State's tagged method names array.
        lstring.c--luaT_init

        # Create reserved words strings in cache.
        llex.c--luaX_init

        # Turn on GC status.
        ```
        g->gcrunning = 1;
        ```

  # Set panic function.
  lapi.c--lua_atpanic


# ----- lua.c--pmain (5MWJ5) -----
static int pmain (lua_State *L)

  lua.c--collectargs

  // Open standard libraries.
  linit.c--luaL_openlibs

  lua.c--createargtable

    lapi.c--lua_createtable

    // 25GPR
    // Set global value `arg`.

  lua.c--handle_script...(2MJMK)


# ----- lua.c--handle_script (2MJMK) -----
# Compile source code file to Lua entry function.
# Push Lua entry function to stack.
# Push command line arguments to stack.
# Call Lua entry function on stack, using `msghandler` as error function.
#
static int handle_script (lua_State *L, char **argv)

  // Compile source code file to Lua entry function.
  // Push Lua entry function to stack.
  lauxlib.h--luaL_loadfile...(5612R)

  // Push command line arguments to stack.
  lua.c--pushargs

  // Call Lua entry function on stack, using `msghandler` as error function.
  lua.c--docall...(5BEQA)


# ----- lauxlib.h--luaL_loadfile (5612R) -----
# Compile source code file to Lua entry function.
#
lauxlib.h--luaL_loadfile

  lauxlib.c--luaL_loadfilex

    lapi.c--lua_load

      ldo.c--luaD_protectedparser

        ldo.c--luaD_pcall...(3RVKZ)

          ldo.c--luaD_rawrunprotected...(2LSGL)

            ldo.c--f_parser...(2OAT3)

      # At this point, the Lua entry function is in stack slot `L->top - 1`.

      # Set globals table as the first upvalue of the entry function.


# ----- lua.c--docall (5BEQA) -----
# Call target function on stack, using `msghandler` as error function.
#
static int docall (lua_State *L, int narg, int nres)
  int status;

  int base = lua_gettop(L) - narg;  /* function index */

  // 24ATD
  // Insert `msghandler` before the target functon.
  // Use `msghandler` as error function.
  lua_pushcfunction(L, msghandler);  /* push message handler */

  lua_insert(L, base);  /* put it under function and args */

  globalL = L;  /* to be available to 'laction' */

  // Register signal handler for SIGINT.
  signal(SIGINT, laction);  /* set C-signal handler */

  // Call `lua_pcall` to call target function on stack.
  // lua.h--lua_pcall...(3GERF)
  status = lua_pcall(L, narg, nres, base);

  // Restore signal handler for SIGINT.
  signal(SIGINT, SIG_DFL); /* reset C-signal handler */

  lua_remove(L, base);  /* remove message handler from the stack */

  // Return call status.
  return status;


# ----- lbaselib.c--luaB_dofile (3XBIZ) -----
# Compile source code file to Lua entry function.
# Push Lua entry function to stack.
# Call Lua entry function on stack.
#
static int luaB_dofile (lua_State *L) {
  const char *fname = luaL_optstring(L, 1, NULL);

  lua_settop(L, 1);

  // Compile source code file to Lua entry function.
  // Push Lua entry function to stack.
  // lauxlib.h--luaL_loadfile...(5612R)
  if (luaL_loadfile(L, fname) != LUA_OK)
    return lua_error(L);

  // Call Lua entry function on stack.
  // lapi.c--lua_callk...(6OHLR)
  lua_callk(L, 0, LUA_MULTRET, 0, dofilecont);

  return dofilecont(L, 0, 0);
}


# ----- lbaselib.c--luaB_pcall (5QUOY) -----
# Call target function with error recovery.
#
static int luaB_pcall (lua_State *L) {
  // Stack: ... | target_func | target_func_args | top

  int status;

  luaL_checkany(L, 1);

  // Push the first on-stack result `true`.
  // Stack: ... | target_func | target_func_args | true | top
  lua_pushboolean(L, 1);  /* first result if no errors */

  // Move the first result `true` below the target function's arguments.
  // Stack: ... | true | target_func | target_func_args | top
  lua_insert(L, 1);  /* put it in place */

  // 6KTFG
  // lapi.c--lua_pcallk...(6YGT0)
  // Arg 1: lua_State.
  // Arg 2: Number of arguments passed to the target function.
  //        `lua_pcallk` uses the last `nargs` arguments near stack top.
  //        `- 2` excludes the first result `true` and the target function.
  // Arg 3: Number of results wanted by the calling context.
  // Arg 4: Error function's stack slot index. 0 is special for nil.
  // Arg 5: Continuation function argument.
  // Arg 6: Continuation function, called during coroutine unrolling in 3HYNI.
  status = lua_pcallk(L, lua_gettop(L) - 2, LUA_MULTRET, 0, 0, finishpcall);

  // lbaselib.c--finishpcall...(7XIVE)
  return finishpcall(L, status, 0);
}


# ----- lbaselib.c--luaB_xpcall (3GVJZ) -----
# Call target function with error recovery and custom error function.
#
static int luaB_xpcall (lua_State *L) {
  // Stack: ... | target_func | error_func | target_func_args | top

  int status;

  int n = lua_gettop(L);

  luaL_checktype(L, 2, LUA_TFUNCTION);  /* check error function */

  // Push the first result `true`.
  // Stack: ... | target_func | error_func | target_func_args | true | top
  lua_pushboolean(L, 1);  /* first result */

  // Push the called function.
  // Stack: ... | target_func | error_func | target_func_args | true
                | target_func | top
  lua_pushvalue(L, 1);  /* function */

  // Move the first result `true` and the called function below the called
  // function's arguments.
  // Stack: ... | target_func | error_func | true | target_func
                | target_func_args | top
  lua_rotate(L, 3, 2);  /* move them below function's arguments */

  // 2AAB2
  // lapi.c--lua_pcallk...(6YGT0)
  // Arg 1: lua_State.
  // Arg 2: Number of arguments passed to the target function.
  //        `lua_pcallk` uses the last `nargs` arguments near the top.
  //        `- 2` excludes the called function and the message handler.
  // Arg 3: Number of results wanted by the calling context.
  // Arg 4: Error function's slot index. 0 is special for nil.
  // Arg 5: Continuation function argument.
  // Arg 6: Continuation function, called during coroutine unrolling in 3HYNI.
  status = lua_pcallk(L, n - 2, LUA_MULTRET, 2, 2, finishpcall);

  // lbaselib.c--finishpcall...(7XIVE)
  return finishpcall(L, status, 2);
}


# ----- lbaselib.c--finishpcall (7XIVE) -----
# Continuation function for 'pcall' and 'xpcall'.
#
static int finishpcall (lua_State *L, int status, lua_KContext extra) {
  if (status != LUA_OK && status != LUA_YIELD) {  /* error? */
    lua_pushboolean(L, 0);  /* first result (false) */
    lua_pushvalue(L, -2);  /* error message */
    return 2;  /* return false, msg */
  }
  else
    // Lua-level C function pushes n results to stack,
    // stored in `L->top - n` to `L->top - 1`.
    // Lua-level C function returns the number of on-stack results.
    return lua_gettop(L) - (int)extra;  /* return all results */
}


# ----- lua.h--lua_pcall (3GERF) -----
# Macro for `lua_pcallk`.
# Continuation function argument `ctx` be 0.
# Continuation function `k` be NULL.
#
```
// lapi.c--lua_pcallk...(6YGT0)
#define lua_pcall(L,n,r,f)  lua_pcallk(L, (n), (r), (f), 0, NULL)
```


# ----- lapi.c--lua_pcallk (6YGT0) -----
# Call target function on stack.
# The target function and its arguments are expected to be pushed on stack.
# They are located according to the arguments count `nargs`.
#
LUA_API int lua_pcallk (
  lua_State *L,
  int nargs,
  int nresults,
  int errfunc,
  lua_KContext ctx,
  lua_KFunction k
)
  // L: lua_State.
  //
  // nargs: Number of arguments passed to the target function.
  // The target function should be on `L->top - (nargs+1)`.
  // The arguments for the target function should be on
  // (L->top - nargs) to (L->top - 1).
  //
  // nresults: Number of results wanted by the calling context.
  //
  // errfunc: Error function's slot index. 0 is special for nil.

  // Argument for `f_call`.
  // The struct contains target function stack slot pointer, and the number of
  // results wanted by the calling context.
  struct CallS c;

  // Call status.
  int status;

  // Bytes offset from stack bottom to the error function.
  ptrdiff_t func;

  lua_lock(L);

  api_check(L, k == NULL || !isLua(L->ci),
    "cannot use continuations inside hooks");

  api_checknelems(L, nargs+1);

  api_check(L, L->status == LUA_OK, "cannot do calls on non-normal thread");

  // Ensure results do not overflow stack.
  checkresults(L, nargs, nresults);

  // If error function's stack slot index is 0.
  if (errfunc == 0)
    // Point `func` to stack bottom `L->stack`.
    // At 7R4LM, the slot on L->stack is set to be nil.
    func = 0;
  else {
    // Get error function's stack slot pointer
    StkId o = index2addr(L, errfunc);

    api_checkstackindex(L, errfunc, o);

    // Point `func` to the error function.
    func = savestack(L, o);
  }

  // Store target function's stack slot pointer in `CallS.func`.
  c.func = L->top - (nargs+1);  /* function to be called */

  // If have no continuation function or is not yieldable, use
  // `luaD_pcall` and `f_call` to call the target function.
  //
  // `f_call` calls `luaD_callnoyield`, which increments `L->nyy`.
  // `L->nny > 0` forbids yields in `lua_yieldk` at 63IHL.
  // The purpose to forbid yields is to ensure all the Lua-level C functions
  // found during coroutine unrolling have continuation function at 5VO87.
  //
  if (k == NULL || L->nny > 0) {  /* no continuation or no yieldable? */
    // Store number of results wanted by calling context in `CallS.nresults`.
    c.nresults = nresults;  /* do a 'conventional' protected call */

    // 631AI
    // ldo.c--luaD_pcall...(3RVKZ)
    // Call `luaD_pcall` to call `f_call`.
    // Arg 1: lua_State.
    // Arg 2: `f_call`, which in turn calls the target function.
    // Arg 3: Userdata pointer passed as argument when calling `f_call`.
    // Arg 4: The old stack top (byte offset from stack bottom) to restore when
    //        the call has error.
    // Arg 5: The error function's stack slot's byte offset from stack bottom.
    //
    status = luaD_pcall(L, f_call, &c, savestack(L, c.func), func);
  }
  else {  /* prepare continuation (call is already protected by 'resume') */
    // 33NSM
    // Get calling context's call info.
    CallInfo *ci = L->ci;

    // Store continuation function in the calling context's call info.
    ci->u.c.k = k;  /* save continuation */

    // Store continuation function argument in the calling context's call info.
    ci->u.c.ctx = ctx;  /* save context */

    // 3T2MK
    // Store target function's stack slot's bytes offset.
    // Used by error recovery at 7ZDHI.
    /* save information for error recovery */
    ci->extra = savestack(L, c.func);

    // 5I0AI
    // Store old error function.
    ci->u.c.old_errfunc = L->errfunc;

    L->errfunc = func;

    setoah(ci->callstatus, L->allowhook);  /* save value of 'allowhook' */

    // 2JIO8
    // Indicate it is a protected call with continuation function for error
    // recovery.
    ci->callstatus |= CIST_YPCALL;  /* function can do error recovery */

    // ldo.c--luaD_call...(60ZE7)
    // Call `luaD_call` to call target function.
    luaD_call(L, c.func, nresults);  /* do the call */

    ci->callstatus &= ~CIST_YPCALL;

    // Restore old error function.
    // `ci->u.c.old_errfunc` is set at 5I0AI.
    L->errfunc = ci->u.c.old_errfunc;

    status = LUA_OK;  /* if it is here, there were no errors */
  }

  // lapi.h--adjustresults...(3RQ2D)
  // If the number of results wanted is unfixed, and the call info's frame top
  // < the stack top, set the call info's frame top to be equal to the stack
  // top.
  adjustresults(L, nresults);

  lua_unlock(L);

  // Return call status.
  return status;



# ----- lapi.c--lua_call (5BUBM) -----
# Macro for `lua_callk`.
# Continuation function argument `ctx` be 0.
# Continuation function `k` be NULL.
#
```
#define lua_call(L,n,r)   lua_callk(L, (n), (r), 0, NULL)
```


# ----- lapi.c--lua_callk (6OHLR) -----
LUA_API void lua_callk (
  lua_State *L,
  int nargs,
  int nresults,
  lua_KContext ctx,
  lua_KFunction k
)
  StkId func;
  lua_lock(L);
  api_check(L, k == NULL || !isLua(L->ci),
    "cannot use continuations inside hooks");
  api_checknelems(L, nargs+1);
  api_check(L, L->status == LUA_OK, "cannot do calls on non-normal thread");
  checkresults(L, nargs, nresults);

  // Get the target function's slot pointer.
  func = L->top - (nargs+1);

  // If have continuation function and is yieldable.
  if (k != NULL && L->nny == 0) {  /* need to prepare continuation? */
    // Store continuation function.
    L->ci->u.c.k = k;  /* save continuation */

    // Store continuation function argument.
    L->ci->u.c.ctx = ctx;  /* save context */

    // Call the target function.
    // ldo.c--luaD_call...(60ZE7)
    luaD_call(L, func, nresults);  /* do the call */
  }
  else  /* no continuation or no yieldable */
    // Call the target function, incrementing `L->nyy` to forbid yields.
    // ldo.c--luaD_callnoyield...(5SH0J)
    luaD_callnoyield(L, func, nresults);  /* just do the call */

  // lapi.h--adjustresults...(3RQ2D)
  // If the number of results wanted is unfixed, and the call info's frame top
  // < the stack top, set the call info's frame top to be equal to the stack
  // top.
  adjustresults(L, nresults);

  lua_unlock(L);


# ----- ldo.c--luaD_pcall (3RVKZ) -----
# Store `L->ci`, `L->allowhook`, `L->nny`, `L->errfunc`.
# Call `luaD_rawrunprotected` to call target function.
# If the status returned by `luaD_rawrunprotected` is not LUA_OK, restore
# `L->ci`, `L->allowhook`, `L->nny`, and call `seterrorobj` to set error
# message to old stack top.
# Restore `L->errfunc`.
#
ldo.c--luaD_pcall(
  lua_State *L,
  Pfunc func,
  void *u,
  ptrdiff_t old_top,
  ptrdiff_t ef
)
  // L: lua_State.
  //
  // func: Target function pointer.
  //
  // u: Target function argument.
  //
  // old_top: Old stack top's stack slot's byte offset from stack bottom.
  //
  // ef: The error function's stack slot's byte offset from stack bottom.

  // Store old call info.
  CallInfo *old_ci = L->ci;

  // Store old `allowhook`
  lu_byte old_allowhooks = L->allowhook;

  // Store old number of non-yieldable calls.
  unsigned short old_nny = L->nny;

  // Store old error function's stack byte offset.
  ptrdiff_t old_errfunc = L->errfunc;

  // Set new error function's stack byte offset.
  L->errfunc = ef;

  // Call `luaD_rawrunprotected` to call target function with given target
  // function argument.
  ldo.c--luaD_rawrunprotected...(2LSGL)
  ```
  status = luaD_rawrunprotected(L, func, u);c
  ```

  if (status != LUA_OK) {  /* an error occurred? */
    // Get old stack top pointer.
    StkId oldtop = restorestack(L, old_top);

    // Close open upvalues.
    luaF_close(L, oldtop);

    // Restore the old stack top.
    // Push error message to stack.
    // The error message is pushed to stack before calling LUAI_THROW at 3GFYH.
    seterrorobj(L, status, oldtop);

    // Restore old call info.
    L->ci = old_ci;

    // Restore old `allowhook`
    L->allowhook = old_allowhooks;

    // Restore old number of non-yieldable calls.
    L->nny = old_nny;

    // Shrink stack.
    ldo.c--luaD_shrinkstack

  // Restore old error function's stack byte offset.
  L->errfunc = old_errfunc;

  // Return call status.
  return status;


# ----- ldo.c--luaD_rawrunprotected (2LSGL) -----
# Store `L->nCcalls`, `L->errorJmp`.
# Point `L->errorJmp` to a new lua_longjmp struct so that `LUAI_TRY`'s setjmp
# stores context info in this struct, not overwriting the old one.
# Call target function.
# Restore `L->nCcalls`, `L->errorJmp`.
# Return the status code in `L->errorJmp.status`.
#
int luaD_rawrunprotected (lua_State *L, Pfunc f, void *ud) {
  // Store old number of nexted C calls
  unsigned short oldnCcalls = L->nCcalls;

  // Create new error jump info.
  struct lua_longjmp lj;

  // Set initial call status.
  lj.status = LUA_OK;

  // Save old error jump info.
  lj.previous = L->errorJmp;  /* chain new error handler */

  // Set new error jump info.
  L->errorJmp = &lj;

  // 7KZPY
  // Save execution context to `L->errorJmp->b` and call target function.
  // ldo.c--LUAI_TRY...(6GUZS)
  LUAI_TRY(L, &lj,
    (*f)(L, ud);
  );

  // Restore old error jump info.
  L->errorJmp = lj.previous;  /* restore old error handler */

  // Restore old number of nexted C calls.
  L->nCcalls = oldnCcalls;

  // Return call status.
  // `lj.status` is set by luaD_throw at 1VSQU.
  return lj.status;
}


# ----- ldo.c--LUAI_TRY (6GUZS) -----
# Save execution context to `L->errorJmp->b` and call target function.
#
# `LUAI_TRY` calls `setjmp` to save current execution context to
# `L->errorJmp->b`, so that in case of error, execution can jump back at 3GFYH
#  by restoring context in `L->errorJmp->b`.
#
```
#define LUAI_TRY(L,c,a)   if (setjmp((c)->b) == 0) { a }
```


# ----- lapi.c--f_call (2FMDX) -----
# Call `luaD_callnoyield` to call target function.
#
# `f_call` is simply an indirection for `luaD_callnoyield` in order to adapt to
# `luaD_rawrunprotected`'s interface.
#
static void f_call (lua_State *L, void *ud)
  struct CallS *c = cast(struct CallS *, ud);

  // ldo.c--luaD_callnoyield...(5SH0J)
  luaD_callnoyield(L, c->func, c->nresults);


# ----- ldo.c--luaD_callnoyield (5SH0J) -----
# Increase `L->nny`.
# Call `luaD_call`.
# Decrease `L->nny`.
#
void luaD_callnoyield (lua_State *L, StkId func, int nResults)
  L->nny++;

  // ldo.c--luaD_call...(60ZE7)
  luaD_call(L, func, nResults);

  L->nny--;


# ----- ldo.c--luaD_call (60ZE7) -----
# Increment `L->nCcalls`.
# Call `luaD_precall`.
# Call `luaV_execute` if `func` is a Lua function.
# Decrement `L->nCcalls`.
#
void luaD_call (lua_State *L, StkId func, int nResults)
  // Increment number of nested C calls.
  // If the number is GE max limit.
  if (++L->nCcalls >= LUAI_MAXCCALLS)
    stackerror(L);

  // ldo.c--luaD_precall...(7KDMP)
  if (!luaD_precall(L, func, nResults))  /* is a Lua function? */

    // lvm.c--luaV_execute...(3UH1T)
    luaV_execute(L);  /* call it */

  // Decrement number of nested C calls.
  L->nCcalls--;


# ----- ldo.c--luaD_precall (7KDMP) -----
# Create call info and point `L->ci` to it.
# If the target function is Lua-level C function, call it, and then
# call `luaD_poscall` to move results and restore to previous call info.
# If the target function is a Lua function, leave it to `luaV_execute`.
#
int luaD_precall (lua_State *L, StkId func, int nresults)
  lua_CFunction f;
  CallInfo *ci;
  switch (ttype(func)) {
    case LUA_TCCL:  /* C closure */
      f = clCvalue(func)->f;
      goto Cfunc;
    case LUA_TLCF:  /* light C function */
      f = fvalue(func);
     Cfunc: {
      int n;  /* number of returns */

      // Ensure stack slots are enough.
      checkstackp(L, LUA_MINSTACK, func);  /* ensure minimum stack size */

      // Create new call info and point `ci` and `L->ci` to it.
      ci = next_ci(L);  /* now 'enter' new function */

      // 2Y2MD
      // Store the number of results wanted by the calling context.
      ci->nresults = nresults;

      // Store the target function's stack slot pointer.
      ci->func = func;

      // 2A3I0
      // Point `ci->top` to right after the target function's stack frame.
      // Because it is a Lua-level C function, its Lua stack frame size is not
      // known by compiler, so it is assumed to be `LUA_MINSTACK`. Slots
      // between [L->top, L->top + LUA_MINSTACK) are reserved for all Lua-level
      // variables the C function uses.
      //
      // `L->top` is set at 3NSCL to point to right after the arguments
      // passed.
      //
      ci->top = L->top + LUA_MINSTACK;

      lua_assert(ci->top <= L->stack_last);

      ci->callstatus = 0;

      if (L->hookmask & LUA_MASKCALL)
        luaD_hook(L, LUA_HOOKCALL, -1);

      lua_unlock(L);

      // Lua-level C function is called directly because no Lua opcodes
      // execution is needed.
      //
      // Lua-level C function does not need offset base bacause arguments and
      // local variables access are not encoded in Lua opcodes.
      //
      // Lua-level C function pushes Lua-level results to stack, stored in
      // `L->top - n` to `L->top - 1`.
      //
      // Lua-level C function returns the number of on-stack results.
      //
      n = (*f)(L);  /* do the actual call */

      lua_lock(L);

      api_checknelems(L, n);

      // ldo.c--luaD_poscall...(2V8KP)
      // Restore previous call info.
      // Move results to slots starting from the target function's slot
      // `L->func`.
      // Adjust `L->top` to point to right after the results wanted.
      luaD_poscall(L, ci, L->top - n, n);

      // Indicate it is a Lua-level C function.
      return 1;
    }
    case LUA_TLCL: {  /* Lua function: prepare its call */
      StkId base;

      // Get the target function's prototype.
      Proto *p = clLvalue(func)->p;

      // 5NTGX
      // Get the number of arguments passed to the target function.
      int n = cast_int(L->top - func) - 1;  /* number of real arguments */

      // Get the target function's frame size.
      int fsize = p->maxstacksize;  /* frame size */

      // Ensure stack slots are enough.
      checkstackp(L, fsize, func);

      // If the target function takes unfixed arguments.
      if (p->is_vararg)
        // Move fixed arguments to slots after unfixed arguments.
        // Set the offset base to point to the first fixed argument's new slot.
        //
        // Unfixed arguments are at negative offsets. In OP_VARARG at 5FKXM, it
        // uses `cast_int(base - ci->func) - cl->p->numparams - 1` to compute
        // the number of unfixed arguments.
        //
        // ldo.c--adjust_varargs...(5TCEL)
        base = adjust_varargs(L, p, n);
      // If the target function not takes unfixed arguments.
      else {  /* non vararg function */
        // 7NEH5
        // If the number of arguments passed is less than the number of fixed
        // arguments wanted, complete with nils.
        for (; n < p->numparams; n++)
          setnilvalue(L->top++);  /* complete missing arguments */

        // Set the offset base to point to the first fixed argument.
        base = func + 1;
      }

      // 53FLN
      // Create new call info and point `ci` and `L->ci` to it.
      ci = next_ci(L);  /* now 'enter' new function */

      // 1PYT2
      // Store the number of results wanted by the calling context.
      ci->nresults = nresults;

      // Store the target function's stack slot pointer.
      ci->func = func;

      // 5ZOOH
      // Store the offset base.
      // Lua function uses offset base to locate arguments and local variables.
      ci->u.l.base = base;

      // 6QZ0U
      // Point `L->top` and `ci->top` to right after the target function's
      // stack frame. Slots between [base, base + fsize) are reserved for all
      // fixed arguments and local variables the Lua function uses. Unfixed
      // arguments are before `base`.
      //
      // Unlike for Lua-level function, `L->top` is not needed to compute the
      // number of arguments passed inside the target function.
      // If less than wanted are passed, fixed arguments will be completed with
      // nils at 7NEH5.
      // If more than wanted are passed, excessive arguments will cause
      // `L->top` to go further at 3NSCL, but is corrected here.
      //
      L->top = ci->top = base + fsize;

      lua_assert(ci->top <= L->stack_last);

      // Point to the first instruction.
      ci->u.l.savedpc = p->code;  /* starting point */

      // 5WEZY
      // Mark as Lua function.
      ci->callstatus = CIST_LUA;

      if (L->hookmask & LUA_MASKCALL)
        callhook(L, ci);

      // Indicate it is a Lua function.
      return 0;
    }
    default: {  /* not a function */
      checkstackp(L, 1, func);  /* ensure space for metamethod */
      tryfuncTM(L, func);  /* try to get '__call' metamethod */
      return luaD_precall(L, func, nresults);  /* now it must be a function */
    }
  }


# ----- ldo.c--luaD_poscall (2V8KP) -----
# Restore previous call info.
# Move results to slots starting from the target function's slot `L->func`.
# Adjust `L->top` to point to right after the results wanted by calling
# context.
#
int luaD_poscall (lua_State *L, CallInfo *ci, StkId firstResult, int nres)
  // `ci->nresults` is the number of results wanted by the calling context.
  // `firstResult` is the first on-stack result.
  // `nres` is the number of on-stack results.

  StkId res;

  // Get the number of results wanted by calling context.
  int wanted = ci->nresults;

  if (L->hookmask & (LUA_MASKRET | LUA_MASKLINE)) {
    if (L->hookmask & LUA_MASKRET) {
      ptrdiff_t fr = savestack(L, firstResult);  /* hook may change stack */
      luaD_hook(L, LUA_HOOKRET, -1);
      firstResult = restorestack(L, fr);
    }
    L->oldpc = ci->previous->u.l.savedpc;  /* 'oldpc' for caller function */
  }

  // Get the target function's slot.
  res = ci->func;  /* res == final position of 1st result */

  // 7MHXA
  // Restore calling context's call info.
  L->ci = ci->previous;  /* back to caller */

  // Move results to slots starting from the target function's slot.
  // Adjust `L->top` to point to right after the results wanted.
  // ldo.c--moveresults...(68GGE)
  /* move results to proper place */
  return moveresults(L, firstResult, res, nres, wanted);


# ----- ldo.c--moveresults (68GGE) -----
# Move results to slots starting from the target function's slot.
# Adjust `L->top` to point to right after the results wanted.
#
int moveresults (
  lua_State *L,
  const TValue *firstResult,
  StkId res,
  int nres,
  int wanted
)
  // `res` is the target function's stack slot.
  // Slots starting from this slot will be overwritten by results.
  //
  // `nres` is the number of results on stack returnd by the target function.
  //
  // `wanted` is the number of results wanted by calling context.

  switch (wanted) {  /* handle typical cases separately */
    case 0: break;  /* nothing to move */
    case 1: {  /* one result needed */
      if (nres == 0)   /* no results? */
        firstResult = luaO_nilobject;  /* adjust with nil */
      setobjs2s(L, res, firstResult);  /* move it to proper place */
      break;
    }
    case LUA_MULTRET: {
      int i;
      for (i = 0; i < nres; i++)  /* move all results to correct place */
        setobjs2s(L, res + i, firstResult + i);

      // 3NTRR
      // Point stack top to right after the last result.
      L->top = res + nres;

      // Return 0 to indicate the number of results wanted is LUA_MULTRET.
      return 0;  /* wanted == LUA_MULTRET */
    }
    default: {
      int i;

      if (wanted <= nres) {  /* enough results? */
        for (i = 0; i < wanted; i++)  /* move results wanted to correct place */
          setobjs2s(L, res + i, firstResult + i);
      }
      else {  /* not enough results; use all of them plus nils */
        for (i = 0; i < nres; i++)  /* move all results to correct place */
          setobjs2s(L, res + i, firstResult + i);

        for (; i < wanted; i++)  /* complete wanted number of results */
          setnilvalue(res + i);
      }

      break;
    }
  }

  // 53IVT
  // Point stack top to right after the last result.
  L->top = res + wanted;

  // Return 1 to indicate the number of results wanted is fixed.
  return 1;


# ----- lapi.h--adjustresults (3RQ2D) -----
# If the number of results wanted is unfixed, and the call info's frame top <
# the stack top, set the call info's frame top to be equal to the stack top.
#
```
#define adjustresults(L,nres) \
  { if ((nres) == LUA_MULTRET && L->ci->top < L->top) L->ci->top = L->top; }
```


# ----- ldo.c--adjust_varargs (5TCEL) -----
# Move fixed arguments to stack slots after unfixed arguments.
# This is necessary because fixed arguments and local variables are accessed
# via fixed offsets (computed by compiler and encoded in VM opcodes) from an
# offset base. If the target function does not take unfixed arguments, the VM
# points the offset base to right after the target function's slot. This way
# does not work if the target function takes unfixed arguments, in which case
# there are unfixed arguments in the middle between the target function's slot
# and the local variables thus the local variables' offsets to the offset base
# can not be fixed. In this case, the fixed arguments are moved to stack slots
# after the unfixed arguments so that the local variables' offsets still work.
#
static StkId adjust_varargs (lua_State *L, Proto *p, int actual) {
  int i;
  int nfixargs = p->numparams;
  StkId base, fixed;
  /* move fixed parameters to final position */
  fixed = L->top - actual;  /* first fixed argument */
  base = L->top;  /* final position of first argument */
  // Move fixed arguments to slots after unfixed arguments
  for (i = 0; i < nfixargs && i < actual; i++) {
    setobjs2s(L, L->top++, fixed + i);
    setnilvalue(fixed + i);  /* erase original copy (for GC) */
  }
  for (; i < nfixargs; i++)
    setnilvalue(L->top++);  /* complete missing arguments */
  return base;
}


# ----- lvm.c--luaV_execute (3UH1T) -----
# Execute VM instructions.
#
void luaV_execute (lua_State *L)
  CallInfo *ci = L->ci;
  LClosure *cl;
  TValue *k;
  StkId base;

  // Used at 6XLYC to determine whether it is the first call.
  ci->callstatus |= CIST_FRESH;  /* fresh invocation of 'luaV_execute" */

 newframe:  /* reentry point when frame changes (call/return) */
  lua_assert(ci == L->ci);

  // Get the target function's closure.
  cl = clLvalue(ci->func);  /* local reference to function's closure */

  // Set the constant table to use.
  k = cl->p->k;  /* local reference to function's constant table */

  // Set the offset base.
  // The offset base points to the target function's first fixed argument.
  // In Lua function, accessing of arguments and local variables are based on
  // the offset base.
  //
  // `ci->u.l.base` is set at 5ZOOH.
  //
  base = ci->u.l.base;  /* local copy of function's base */

  /* main loop of interpreter */
  for (;;) {
    // Updated in `vmfetch`
    Instruction i;

    // Updated in `vmfetch`
    StkId ra;

    vmfetch();

    vmdispatch (GET_OPCODE(i)) {...}
  }


#define vmfetch() { \
  i = *(ci->u.l.savedpc++); \
  if (L->hookmask & (LUA_MASKLINE | LUA_MASKCOUNT)) \
    Protect(luaG_traceexec(L)); \
  ra = RA(i); /* WARNING: any stack reallocation invalidates 'ra' */ \
  lua_assert(base == ci->u.l.base); \
  lua_assert(base <= L->top && L->top < L->stack + L->stacksize); \
}


#define Protect(x)  { {x;}; base = ci->u.l.base; }


# ----- lcorolib.c--luaB_cocreate -----
# Create coroutine's lua_State
#
static int luaB_cocreate (lua_State *L)
  lua_State *NL;

  // Ensure the first argument is a function, i.e. the coroutine function.
  luaL_checktype(L, 1, LUA_TFUNCTION);

  // Create lua_State and push to stack.
  NL = lua_newthread(L);

    lstate.c--stack_init...(6KL5G)

  // Push the coroutine function to stack.
  lua_pushvalue(L, 1);  /* move function to top */

  // Move the coroutine function to the new state's stack.
  // The source stack top will be decremented.
  lua_xmove(L, NL, 1);  /* move function from L to NL */

  // Indicate there is one return value on stack, i.e. the new lua_State.
  return 1;


# ----- lstate.c--stack_init (6KL5G) -----
static void stack_init (lua_State *L1, lua_State *L) {
  int i; CallInfo *ci;

  /* initialize stack array */
  L1->stack = luaM_newvector(L, BASIC_STACK_SIZE, TValue);
  L1->stacksize = BASIC_STACK_SIZE;

  // Set each slot be nil.
  for (i = 0; i < BASIC_STACK_SIZE; i++)
    setnilvalue(L1->stack + i);  /* erase new stack */

  // Set stack top.
  L1->top = L1->stack;

  // Set stack limit.
  L1->stack_last = L1->stack + L1->stacksize - EXTRA_STACK;

  // 7IEPS
  // `base_ci` is the first call info of a Lua thread.
  /* initialize first ci */
  ci = &L1->base_ci;

  ci->next = ci->previous = NULL;

  ci->callstatus = 0;

  // Set the first call info's `func` be nil because it is special.
  // `L1->top` is nil.
  ci->func = L1->top;

  // 7R4LM
  // Set the target function on stack be nil because it is special.
  setnilvalue(L1->top++);  /* 'function' entry for this 'ci' */

  // Set frame limit.
  ci->top = L1->top + LUA_MINSTACK;

  // Set current call info.
  L1->ci = ci;
}


# ----- lcorolib.c--luaB_cowrap -----
# Usage:
# ```
# local run_coroutine = coroutine.wrap(function()
#     print("test")
# end)
# run_coroutine()
# ```
#
static int luaB_cowrap (lua_State *L)
  // Create lua_State.
  luaB_cocreate(L);

  // Push `luaB_auxwrap` to stack.
  lua_pushcclosure(L, luaB_auxwrap, 1);

  // Indicate there is one return value on stack, i.e. `luaB_auxwrap`.
  return 1;


# ----- lcorolib.c--luaB_coresume -----
# Move resume arguments to coroutine's stack.
# Resume to coroutine, until the coroutine yields or ends.
# Move a true/false and resume results to calling context's stack.
#
static int luaB_coresume (lua_State *L)
  // Get the first on-stack argument, i.e. the coroutine's lua_State.
  lua_State *co = getco(L);

  int r;

  // Resume to the coroutine.
  //
  // `- 1` is because the first on-stack argument is the coroutine's lua_State.
  // Following on-stack arguments are to be passed to the coroutine.
  //
  // `lua_gettop` counts the slots between (L->top, L->ci->func).
  // `L->top` is set at 3NSCL to point to right after the arguments passed.
  //
  // lcorolib.c--auxresume...(3ZUFQ)
  r = auxresume(L, co, lua_gettop(L) - 1);

  // If have error.
  if (r < 0) {
    // Push `false`.
    lua_pushboolean(L, 0);

    // Insert the `false` before the error message.
    lua_insert(L, -2);

    // Return the number of on-stack results.
    return 2;  /* return false + error message */
  }
  else {
    // Push `true`.
    lua_pushboolean(L, 1);

    // Insert the `true` before on-stack results.
    lua_insert(L, -(r + 1));

    // Return the number of on-stack results.
    return r + 1;  /* return true + 'resume' returns */
  }


# ----- lcorolib.c--auxresume (3ZUFQ) -----
# Move resume arguments to coroutine's stack.
# Resume to coroutine, until the coroutine yields or ends.
# Move resume results to calling context's stack.
#
static int auxresume (lua_State *L, lua_State *co, int narg)
  int status;

  if (!lua_checkstack(co, narg)) {
    // Push error message.
    lua_pushliteral(L, "too many arguments to resume");

    // Indicate on-stack result is error message.
    return -1;  /* error flag */
  }

  if (lua_status(co) == LUA_OK && lua_gettop(co) == 0) {
    // Push error message.
    lua_pushliteral(L, "cannot resume dead coroutine");

    // Indicate on-stack result is error message.
    return -1;  /* error flag */
  }

  // Move resume arguments to the coroutine's stack.
  lua_xmove(L, co, narg);

  // Resume to the coroutine.
  // ldo.c--lua_resume...(2O7W6)
  status = lua_resume(co, L, narg);

  // If the coroutine ends or yields.
  if (status == LUA_OK || status == LUA_YIELD) {
    // 7XZWI
    // Get number of on-stack results.
    int nres = lua_gettop(co);

    // If the results overflow the calling context's stack.
    if (!lua_checkstack(L, nres + 1)) {
      // Remove the results.
      lua_pop(co, nres);  /* remove results anyway */

      // Push error message.
      lua_pushliteral(L, "too many results to resume");

      // Indicate on-stack result is error message.
      return -1;  /* error flag */
    }

    // Move on-stack results from the coroutine to the calling context.
    lua_xmove(co, L, nres);  /* move yielded values */

    // Return number of on-stack results.
    return nres;
  }
  else {
    // Move error message to the calling context's stack.
    lua_xmove(co, L, 1);  /* move error message */

    // Indicate on-stack result is error message.
    return -1;  /* error flag */
  }


# ----- ldo.c--lua_resume (2O7W6) -----
# Resume to coroutine, with error recovery.
#
LUA_API int lua_resume (lua_State *L, lua_State *from, int nargs)
  int status;

  // Store old number of non-yieldable calls.
  unsigned short oldnny = L->nny;  /* save "number of non-yieldable" calls */

  lua_lock(L);

  if (L->status == LUA_OK) {  /* may be starting a coroutine */
    if (L->ci != &L->base_ci)  /* not in base level? */
      return resume_error(L, "cannot resume non-suspended coroutine", nargs);
  }
  else if (L->status != LUA_YIELD)
    return resume_error(L, "cannot resume dead coroutine", nargs);

  // Increment number of C calls.
  L->nCcalls = (from) ? from->nCcalls + 1 : 1;

  if (L->nCcalls >= LUAI_MAXCCALLS)
    return resume_error(L, "C stack overflow", nargs);

  luai_userstateresume(L, nargs);

  // Yields are allowed only in resumed coroutine.
  L->nny = 0;  /* allow yields */

  api_checknelems(L, (L->status == LUA_OK) ? nargs + 1 : nargs);

  // 271W9
  // ldo.c--luaD_rawrunprotected...(2LSGL)
  // ldo.c--resume...(29IQU)
  // Call `luaD_rawrunprotected` to call `resume`.
  status = luaD_rawrunprotected(L, resume, &nargs);

  if (status == -1)  /* error calling 'lua_resume'? */
    status = LUA_ERRRUN;
  else {  /* continue running after recoverable errors */
    // If is error status, recover lua_State to the lastest protected call.
    // If the recovery is successful, unroll.
    // ldo.c--recover...(5QRWN)
    while (errorstatus(status) && recover(L, status)) {
      // Unroll the call stack.
      // ldo.c--unroll...(3HYNI)
      /* unroll continuation */
      status = luaD_rawrunprotected(L, unroll, &status);
    }
    if (errorstatus(status)) {  /* unrecoverable error? */
      // Store error status.
      L->status = cast_byte(status);  /* mark thread as 'dead' */

      // Set error message.
      seterrorobj(L, status, L->top);  /* push error message */

      // Set frame limit.
      L->ci->top = L->top;
    }
    else lua_assert(status == L->status);  /* normal end or yield */
  }

  // Restore old number of non-yieldable calls.
  L->nny = oldnny;  /* restore 'nny' */

  // Decrement number of C calls.
  L->nCcalls--;

  lua_assert(L->nCcalls == ((from) ? from->nCcalls : 0));

  lua_unlock(L);

  return status;


# ----- ldo.c--resume (29IQU) -----
# Resume to coroutine.
#
static void resume (lua_State *L, void *ud) {
  int n = *(cast(int*, ud));  /* number of arguments */
  StkId firstArg = L->top - n;  /* first argument */
  CallInfo *ci = L->ci;
  if (L->status == LUA_OK) {  /* starting a coroutine? */
    // Use `LUA_MULTRET` to point `L->top` to right after all results after
    // the call. At 7XZWI, `L->top` is used to compute the number of results.
    if (!luaD_precall(L, firstArg - 1, LUA_MULTRET))  /* Lua function? */
      luaV_execute(L);  /* call it */
  }
  else {  /* resuming from previous yield */
    lua_assert(L->status == LUA_YIELD);

    L->status = LUA_OK;  /* mark that it is running (again) */

    // 76D0Z
    // Get the coroutine function's slot.
    // `ci->extra` is set at 2YSOR.
    // `ci->func` is changed at 6ELKB so restoring is needed here.
    ci->func = restorestack(L, ci->extra);

    if (isLua(ci))  /* yielded inside a hook? */
      luaV_execute(L);  /* just continue running Lua code */
    else {  /* 'common' yield */
      if (ci->u.c.k != NULL) {  /* does it have a continuation function? */
        lua_unlock(L);

        // Call continuation function.
        n = (*ci->u.c.k)(L, LUA_YIELD, ci->u.c.ctx); /* call continuation */

        lua_lock(L);

        api_checknelems(L, n);

        firstArg = L->top - n;  /* yield results come from continuation */
      }

      // ldo.c--luaD_poscall...(2V8KP)
      // Restore previous call info.
      // Move results to slots starting from the target function's slot.
      // Adjust `L->top` to point to right after the results wanted.
      luaD_poscall(L, ci, firstArg, n);  /* finish 'luaD_precall' */
    }

    // Unroll.
    // ldo.c--unroll...(3HYNI)
    unroll(L, NULL);  /* run continuation */
  }
}


# ----- ldo.c--recover (5QRWN) -----
# Recover lua_State to the lastest protected call with continuation function.
#
static int recover (lua_State *L, int status)
  StkId oldtop;

  // Find the call info of the latest protected call with continuation
  // function.
  CallInfo *ci = findpcall(L);

  if (ci == NULL) return 0;  /* no recovery point */

  // 7ZDHI
  // Get the target function's slot.
  // `ci->extra` is set at 3T2MK.
  /* "finish" luaD_pcall */
  oldtop = restorestack(L, ci->extra);

  luaF_close(L, oldtop);

  // Restore the target function's stack top.
  // Push error message to stack.
  seterrorobj(L, status, oldtop);

  // Restore the target function's call info.
  L->ci = ci;

  // Restore the target function's `allowhook`.
  L->allowhook = getoah(ci->callstatus);  /* restore original 'allowhook' */

  // Allow yields.
  L->nny = 0;  /* should be zero to be yieldable */

  luaD_shrinkstack(L);

  // Restore the target function's error function.
  // `ci->u.c.old_errfunc` is set at 5I0AI.
  L->errfunc = ci->u.c.old_errfunc;

  // Indicate have recovered to the latest protected call.
  return 1;  /* continue running the coroutine */


# ----- ldo.c--unroll (3HYNI) -----
# Unroll a coroutine until the stack is empty or another interruption occurs.
#
static void unroll (lua_State *L, void *ud)
  // `ud` is call status.
  if (ud != NULL)  /* error status? */
    // ldo.c--finishCcall (7XCXY)
    finishCcall(L, *(int *)ud);  /* finish 'lua_pcallk' callee */

  while (L->ci != &L->base_ci) {  /* something in the stack */
    // If is not a Lua function.
    // For Lua function, `CIST_LUA` is set at 5WEZY.
    if (!isLua(L->ci))  /* C function? */
      // Finish the Lua-level C function during unrolling by calling its
      // continuation function.
      //
      // Lua-level C functions found here are guaranteed to have continuation
      // function. If the C function calls `luaB_pcall` or `luaB_xpcall`, the
      // two call `lua_pcallk` with continuation function. If the C function
      // calls `lua_pcallk` without a continuation function, the target
      // function will be called using `f_call` at 631AI, which calls
      // `luaD_callnoyield`, which increments `L->nyy`, thus forbids yields in
      // `lua_yieldk` at 63IHL.
      //
      // ldo.c--finishCcall (7XCXY)
      finishCcall(L, LUA_YIELD);  /* complete its execution */
    // If is a Lua function.
    else {  /* Lua function */
      // Finish current opcode.
      // lvm.c--luaV_finishOp (3ROK8)
      luaV_finishOp(L);  /* finish interrupted instruction */

      // Execute remaining opcodes.
      luaV_execute(L);  /* execute down to higher C 'boundary' */
    }
  }


# ----- ldo.c--finishCcall (7XCXY) -----
# Finish a Lua-level C function during unrolling by calling its continuation
# function.
#
static void finishCcall (lua_State *L, int status) {
  CallInfo *ci = L->ci;

  int n;

  /* must have a continuation and must be able to call it */
  lua_assert(ci->u.c.k != NULL && L->nny == 0);
  /* error status can only happen in a protected call */

  // CIST_YPCALL is set at 2JIO8.
  lua_assert((ci->callstatus & CIST_YPCALL) || status == LUA_YIELD);

  if (ci->callstatus & CIST_YPCALL) {  /* was inside a pcall? */
    ci->callstatus &= ~CIST_YPCALL;  /* continuation is also inside it */

    // Restore old error function.
    // `ci->u.c.old_errfunc` is set at 5I0AI.
    L->errfunc = ci->u.c.old_errfunc;  /* with the same error function */
  }

  // lapi.h--adjustresults...(3RQ2D)
  // If the number of results wanted is unfixed, and the call info's frame top
  // < the stack top, set the call info's frame top to be equal to the stack
  // top.
  //
  /* finish 'lua_callk'/'lua_pcall'; CIST_YPCALL and 'errfunc' already
     handled */
  adjustresults(L, ci->nresults);

  lua_unlock(L);

  // 5VO87
  // Call continuation function.
  // Continuation function pushes n results to stack,
  // stored in `L->top - n` to `L->top - 1`.
  // Continuation function returns the number of on-stack results.
  //
  // At 6KTFG and 2AAB2, continuation function is given.
  //
  n = (*ci->u.c.k)(L, status, ci->u.c.ctx);  /* call continuation function */

  lua_lock(L);

  api_checknelems(L, n);

  // ldo.c--luaD_poscall...(2V8KP)
  // Restore previous call info.
  // Move results to slots starting from the target function's slot.
  // Adjust `L->top` to point to right after the results wanted.
  luaD_poscall(L, ci, L->top - n, n);  /* finish 'luaD_precall' */


# ----- lvm.c--luaV_finishOp (3ROK8) -----
# Finish execution of an opcode interrupted by an yield.
#
void luaV_finishOp (lua_State *L)
  CallInfo *ci = L->ci;
  StkId base = ci->u.l.base;
  Instruction inst = *(ci->u.l.savedpc - 1);  /* interrupted instruction */
  OpCode op = GET_OPCODE(inst);
  switch (op) {  /* finish its execution */
    case OP_ADD: case OP_SUB: case OP_MUL: case OP_DIV: case OP_IDIV:
    case OP_BAND: case OP_BOR: case OP_BXOR: case OP_SHL: case OP_SHR:
    case OP_MOD: case OP_POW:
    case OP_UNM: case OP_BNOT: case OP_LEN:
    case OP_GETTABUP: case OP_GETTABLE: case OP_SELF: {
      setobjs2s(L, base + GETARG_A(inst), --L->top);
      break;
    }
    case OP_LE: case OP_LT: case OP_EQ: {
      int res = !l_isfalse(L->top - 1);
      L->top--;
      if (ci->callstatus & CIST_LEQ) {  /* "<=" using "<" instead? */
        lua_assert(op == OP_LE);
        ci->callstatus ^= CIST_LEQ;  /* clear mark */
        res = !res;  /* negate result */
      }
      lua_assert(GET_OPCODE(*ci->u.l.savedpc) == OP_JMP);
      if (res != GETARG_A(inst))  /* condition failed? */
        ci->u.l.savedpc++;  /* skip jump instruction */
      break;
    }
    case OP_CONCAT: {
      StkId top = L->top - 1;  /* top when 'luaT_trybinTM' was called */
      int b = GETARG_B(inst);      /* first element to concatenate */
      int total = cast_int(top - 1 - (base + b));  /* yet to concatenate */
      setobj2s(L, top - 2, top);  /* put TM result in proper position */
      if (total > 1) {  /* are there elements to concat? */
        L->top = top - 1;  /* top is one after last element (at top-2) */
        luaV_concat(L, total);  /* concat them (may yield again) */
      }
      /* move final result to final position */
      setobj2s(L, ci->u.l.base + GETARG_A(inst), L->top - 1);
      L->top = ci->top;  /* restore top */
      break;
    }
    case OP_TFORCALL: {
      lua_assert(GET_OPCODE(*ci->u.l.savedpc) == OP_TFORLOOP);
      L->top = ci->top;  /* correct top */
      break;
    }
    case OP_CALL: {
      if (GETARG_C(inst) - 1 >= 0)  /* nresults >= 0? */
        L->top = ci->top;  /* adjust results */
      break;
    }
    case OP_TAILCALL: case OP_SETTABUP: case OP_SETTABLE:
      break;
    default: lua_assert(0);
  }


# ----- lcorolib.c--luaB_yield (5FE7E) -----
# Yield from coroutine.
#
static int luaB_yield (lua_State *L)

  // lcorolib.c--lua_yield...(70HS9)
  return lua_yield(L, lua_gettop(L));


# ----- lcorolib.c--lua_yield (70HS9) -----
# Macro for `lua_yieldk`.
# Continuation function argument `ctx` be 0.
# Continuation function `k` be NULL.
```
// lcorolib.c--lua_yieldk...(3E6PN)
#define lua_yield(L,n)    lua_yieldk(L, (n), 0, NULL)
```


# ----- lcorolib.c--lua_yieldk (3E6PN) -----
# Yield from coroutine.
#
LUA_API int lua_yieldk (
  lua_State *L,
  int nresults,
  lua_KContext ctx,
  lua_KFunction k
)
  CallInfo *ci = L->ci;

  luai_userstateyield(L, nresults);

  lua_lock(L);

  api_checknelems(L, nresults);

  // 63IHL
  // If yields are forbidden.
  if (L->nny > 0) {
    if (L != G(L)->mainthread)
      // Will jump to 7KZPY.
      luaG_runerror(L, "attempt to yield across a C-call boundary");
    else
      // Will jump to 7KZPY.
      luaG_runerror(L, "attempt to yield from outside a coroutine");
  }

  // Mark as yield.
  L->status = LUA_YIELD;

  // 2YSOR
  // Store the target function's slot.
  // Used at 76D0Z.
  ci->extra = savestack(L, ci->func);  /* save current 'func' */

  if (isLua(ci)) {  /* inside a hook? */
    api_check(L, k == NULL, "hooks cannot continue after yielding");
  }
  else {
    if ((ci->u.c.k = k) != NULL)  /* is there a continuation? */
      // Store continuation function's argument.
      ci->u.c.ctx = ctx;  /* save context */

    // 6ELKB
    // At 7XZWI, `auxresume` considers all slots after the function slot as
    // results.
    // So change `ci->func` to make it take `nresults` results only.
    ci->func = L->top - nresults - 1;  /* protect stack below results */

    // Jump to 271W9.
    luaD_throw(L, LUA_YIELD);
  }

  lua_assert(ci->callstatus & CIST_HOOKED);  /* must be inside a hook */

  lua_unlock(L);

  return 0;  /* return to 'luaD_hook' */


# ----- OP_CALL -----
vmcase(OP_CALL)
  // Get the number of arguments passed to the function plus 1.
  // The number of arguments passed is determined by compiler and encoded in
  // opcode. It is used at 3NSCL below to affect `L->top`. `L-top` is then used
  // to compute the number of arguments passed in Lua-level C functions using
  // `lua_gettop`, or at 5NTGX for Lua functions.
  int b = GETARG_B(i);

  // 7KOMK
  // Get the number of results wanted by calling context.
  // OP_CALL's argument C is determined by the calling context, not by the
  // target function's return statement.
  int nresults = GETARG_C(i) - 1;

  // 3NSCL
  // If the number of arguments passed is fixed,
  // point stack top to right after the arguments.
  //
  // If the number of arguments passed is unfixed, `L->top` should be set by
  // previous OP_CALL's corresponding OP_RETURN in `luaD_poscall moveresults`
  // at 3NTRR.
  //
  // In `luaD_precall` at 5NTGX, `cast_int(L->top - func) - 1` computes the
  // number of arguments passed to the function.
  //
  if (b != 0) L->top = ra+b;  /* else previous instruction set top */

  // ldo.c--luaD_precall...(7KDMP)
  if (luaD_precall(L, ra, nresults)) {  /* C function? */
    // If the number of results wanted by calling context is fixed.
    if (nresults >= 0)
      // 3G9C6
      // Point `L->top` to right after the current function's stack frame.
      // `ci->top` is set at 2A3I0 and 6QZ0U before executing the current
      // function.
      //
      // The same is done for Lua function at 5WFHY.
      //
      L->top = ci->top;  /* adjust results */

    // Restore current function's offset base.
    Protect((void)0);  /* update 'base' */
  }
  else {  /* Lua function */
    // Point `ci` to the target function's call info.
    ci = L->ci;

    // Re-enter to execute the target function.
    goto newframe;  /* restart luaV_execute over new Lua function */
  }
  vmbreak;


# ----- OP_VARARG -----
vmcase(OP_VARARG)
  // Get the number of values wanted.
  int b = GETARG_B(i) - 1;  /* required results */
  int j;

  // 5FKXM
  // Get the number of unfixed arguments.
  int n = cast_int(base - ci->func) - cl->p->numparams - 1;

  if (n < 0)  /* less arguments than parameters? */
    n = 0;  /* no vararg arguments */

  if (b < 0) {  /* B == 0? */
    // Take all unfixed arguments.
    b = n;  /* get all var. arguments */

    Protect(luaD_checkstack(L, n));

    ra = RA(i);  /* previous call may change the stack */

    // 6TNUV
    // This is for `return ...` situation.
    L->top = ra + n;
  }

  for (j = 0; j < b && j < n; j++)
    setobjs2s(L, ra + j, base - n + j);

  for (; j < b; j++)  /* complete required results with nil */
    setnilvalue(ra + j);

  vmbreak;


# ----- OP_RETURN -----
vmcase(OP_RETURN)
  // Get number of on-stack results plus 1.
  int b = GETARG_B(i);

  // Close open upvalues.
  if (cl->p->sizep > 0) luaF_close(L, base);

  // ldo.c--luaD_poscall...(2V8KP)
  // The return value indicates wether the number of results wanted by the
  // calling context is fixed.
  b = luaD_poscall(L, ci, ra, (b != 0 ? b - 1 : cast_int(L->top - ra)));

  // 6XLYC
  if (ci->callstatus & CIST_FRESH)  /* local 'ci' still from callee */
    // Leave `L->top` unchanged to let caller determine the number of results.
    return;  /* external invocation: return */
  else {  /* invocation via reentry: continue execution */
    // Set previous call info as current.
    // `L->ci` is pointed to the previous call info in `luaD_poscall` above.
    ci = L->ci;

    // 3G9C6
    // If the number of results wanted by the calling function is fixed,
    // point `L->top` to right after the previous function's stack frame.
    // `ci->top` is set at 2A3I0 and 6QZ0U before executing the calling
    // function. The same is done for Lua-level C function at 5WFHY.
    //
    // If the number of results wanted is fixed, `L->top` is set in
    // `luaD_poscall moveresults` at 53IVT to point to right after results.
    //
    // If the number of results wanted is unfixed, `L->top` is set in
    // `luaD_poscall moveresults` at 3NTRR to point to right after results.
    //
    if (b) L->top = ci->top;

    lua_assert(isLua(ci));
    lua_assert(GET_OPCODE(*((ci)->u.l.savedpc - 1)) == OP_CALL);

    goto newframe;  /* restart luaV_execute over new Lua function */
  }
`````
