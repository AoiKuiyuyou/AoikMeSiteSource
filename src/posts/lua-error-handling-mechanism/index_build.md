--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Lua error handling mechanism

author: Aoik

create_time: 2019-03-30 20:00:00

tags:
    - lua
    - source-code-study
    - 吸星大法强吃源码

post_id: 20

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Lua error handling mechanism
Lua version 5.3.5.

Lua's execution flow has been introduced in
[this post](https://aoik.me/blog/posts/lua-execution-flow).

In Lua, invalid operations like performing arithmetic operation on `nil` will cause an error. Arbitrary errors can be raised in user code by calling function
`error`.

The Lua language does not provide syntax for catching errors. To catch errors
without aborting the execution, user code should use `pcall` or `xpcall` to
call a target function that may cause errors:
```
pcall(target_func)

xpcall(target_func, error_handler)
```

Internally, `pcall` in user code corresponds to  `lbaselib.c--luaB_pcall`. In
`lbaselib.c--luaB_pcall`, a chain of calls happens: `lapi.c--lua_pcallk` -> `ldo.c--luaD_pcall` -> `ldo.c--luaD_rawrunprotected`:
```
int luaD_rawrunprotected (lua_State *L, Pfunc f, void *ud) {
  // Save old number of nexted C calls
  unsigned short oldnCcalls = L->nCcalls;

  // Create new error jump info
  struct lua_longjmp lj;

  // Set initial status
  lj.status = LUA_OK;

  // Save old error jump info
  lj.previous = L->errorJmp;  /* chain new error handler */

  // Set new error jump info
  L->errorJmp = &lj;

  // `LUAI_TRY` calls `setjmp` to save current execution context to
  // `L->errorJmp->b`, so that in case of an error, execution can jump back by
  // restoring context in `L->errorJmp->b`. `LUAI_TRY` calls `(*f)(L, ud)`.
  LUAI_TRY(L, &lj,
    (*f)(L, ud);
  );

  // Restore old error jump info
  L->errorJmp = lj.previous;  /* restore old error handler */

  // Restore old number of nexted C calls
  L->nCcalls = oldnCcalls;

  // Return call status
  return lj.status;
}
```

In `ldo.c--luaD_rawrunprotected`, it replaces `L->errorJmp` with a new
`lua_longjmp` struct (the old one can still be found via `L->errorJmp.previous`
):
```
#define luai_jmpbuf   jmp_buf

struct lua_longjmp {
  struct lua_longjmp *previous;
  luai_jmpbuf b;
  volatile int status;  /* error code */
};
```

Then `ldo.c--LUAI_TRY` is called with the new `lua_longjmp` struct.
```
#define LUAI_TRY(L,c,a)   if (setjmp((c)->b) == 0) { a }
```
`c` is a pointer to the new `lua_longjmp` struct. `a` is the statement that
calls the target function corresponding to the argument to `pcall` in user
code.

`setjmp` stores the current execution context in `(c)->b` (i.e.
`L->errorJmp.b`), then returns 0. If it returns 0, the statement `a` that calls the target function will run. The case it returns non-zero will be talked about later.

The target function runs until an error occurs.

Internally, when an error occurs, `ldebug.c--luaG_runerror` is called:
```
l_noret luaG_runerror (lua_State *L, const char *fmt, ...) {
  CallInfo *ci = L->ci;
  const char *msg;
  va_list argp;
  luaC_checkGC(L);  /* error message uses memory */
  va_start(argp, fmt);
  msg = luaO_pushvfstring(L, fmt, argp);  /* format message */
  va_end(argp);
  if (isLua(ci))  /* if Lua function, add source:line information */
    luaG_addinfo(L, msg, ci_func(ci)->p->source, currentline(ci));
  luaG_errormsg(L);
}
```

`ldebug.c--luaG_runerror` pushes an error message to stack, then calls
`ldebug.c--luaG_errormsg`. (The `error` function in user code corresponds to
`lbaselib.c--luaB_error`, which calls `lapi.c--lua_error`, which calls
`ldebug.c--luaG_errormsg` too.)
```
l_noret luaG_errormsg (lua_State *L) {
  if (L->errfunc != 0) {  /* is there an error handling function? */
    // Get error function's TValue pointer.
    StkId errfunc = restorestack(L, L->errfunc);

    // Put error message in `L->top`.
    setobjs2s(L, L->top, L->top - 1);  /* move argument */

    // Put error function's TValue in `L->top - 1`.
    setobjs2s(L, L->top - 1, errfunc);  /* push function */

    L->top++;  /* assume EXTRA_STACK */

    // Call the error function
    luaD_callnoyield(L, L->top - 2, 1);  /* call it */
  }
  
  luaD_throw(L, LUA_ERRRUN);
}
```

In `ldebug.c--luaG_errormsg`, if an error handler is present in `L->errfunc`,
it is called. Then `ldo.c--luaD_throw` is called:
```
l_noret luaD_throw (lua_State *L, int errcode) {
  if (L->errorJmp) {  /* thread has an error handler? */
    L->errorJmp->status = errcode;  /* set status */
    LUAI_THROW(L, L->errorJmp);  /* jump to it */
  }
  else {  /* thread has no error handler */
    global_State *g = G(L);
    L->status = cast_byte(errcode);  /* mark it as dead */
    if (g->mainthread->errorJmp) {  /* main thread has a handler? */
      setobjs2s(L, g->mainthread->top++, L->top - 1);  /* copy error obj. */
      luaD_throw(g->mainthread, errcode);  /* re-throw in main thread */
    }
    else {  /* no handler at all; abort */
      if (g->panic) {  /* panic function? */
        seterrorobj(L, errcode, L->top);  /* assume EXTRA_STACK */
        if (L->ci->top < L->top)
          L->ci->top = L->top;  /* pushing msg. can break this invariant */
        lua_unlock(L);
        g->panic(L);  /* call panic function (last chance to jump out) */
      }
      abort();
    }
  }
}
```

In `ldo.c--luaD_throw`, if `L->errorJmp` is present (recall `L->errorJmp` is
set with a new `lua_longjmp` struct in `ldo.c--luaD_rawrunprotected`), the
error code will be stored in `L->errorJmp->status`. Then `ldo.c--LUAI_THROW` is
called with `L->errorJmp`:
```
#define LUAI_THROW(L,c)   longjmp((c)->b, 1)
```

In `ldo.c--LUAI_THROW`, `longjmp` is called with the execution context stored
in `L->errorJmp.b`. Now the execution flow jumps back to where the
corresponding `setjmp` that stored the execution context in `L->errorJmp.b`
was called:
```
#define LUAI_TRY(L,c,a)   if (setjmp((c)->b) == 0) { a }
```

Notice the second argument of `longjmp` is 1, which will become the return
value of the `setjmp`. Now that `setjmp` returns non-zero, the statement `a`
will not run.

In `ldo.c--luaD_rawrunprotected`, after `LUAI_TRY` is done, the old
`lua_longjmp` struct pointed to by `L->errorJmp.previous` is restored as
`L->errorJmp`. The status code stored in `L->errorJmp->status` during the
target function call is used as the return value (recall the error code is
stored in it by `ldo.c--luaD_throw`).

In `lbaselib.c--luaB_pcall`, the chain of calls `lapi.c--lua_pcallk` ->
`ldo.c--luaD_pcall` -> `ldo.c--luaD_rawrunprotected` returns. The status code
is returned. Then `lbaselib.c--finishpcall` is called:
```
static int finishpcall (lua_State *L, int status, lua_KContext extra) {
  if (status != LUA_OK && status != LUA_YIELD) {  /* error? */
    lua_pushboolean(L, 0);  /* first result (false) */
    lua_pushvalue(L, -2);  /* error message */
    return 2;  /* return false, msg */
  }
  else
    return lua_gettop(L) - (int)extra;  /* return all results */
}
```

If the status code indicates an error, the first return value of `pcall` in
user code is set to be `false`, the second return value is set to be the error
message pushed to stack by `ldebug.c--luaG_runerror`.

If the status code indicates no error, the first return value of `pcall` in
user code is set to be `true` (already pushed to stack in
`lbaselib.c--luaB_pcall`), followed by return values from the target
function called.

In summary, error handling is implemented by storing execution context using
`setjump`, and jumping back using `longjump` in case of an error. Before
jumping back, an error message is pushed to stack, and the error code is stored
in `L->errorJmp.status`. According to whether the status code indicates an
error, `pcall` or `xpcall` returns either `false` or `true` as the first return
value.
