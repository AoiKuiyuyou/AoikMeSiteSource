--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Lua function call mechanism

author: Aoik

create_time: 2019-03-28 20:00:00

tags:
    - lua
    - source-code-study
    - 吸星大法强吃源码

post_id: 19

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Lua function call mechanism
Lua version 5.3.5.

Lua's execution flow has been introduced in [this post](https://aoik.me/blog/posts/lua-execution-flow).

\
In Lua, functions are represented as two types `CClosure` and `LClosure`, for
functions defined in C and Lua respectively.
```
#define ClosureHeader \
  CommonHeader; lu_byte nupvalues; GCObject *gclist


typedef int (*lua_CFunction) (lua_State *L);


typedef struct CClosure {
  ClosureHeader;
  lua_CFunction f;
  TValue upvalue[1];  /* list of upvalues */
} CClosure;


typedef struct LClosure {
  ClosureHeader;
  struct Proto *p;
  UpVal *upvals[1];  /* list of upvalues */
} LClosure;


typedef union Closure {
  CClosure c;
  LClosure l;
} Closure;
```

\
Functions are called closures because they have `upvalues` associated with them.
The `CClosure` struct contains an array of `TValue` values as upvalues. The
`LClosure` struct contains an array of `UpVal` pointers:
```
struct UpVal {
  TValue *v;  /* points to stack or to its own value */
  lu_mem refcount;  /* reference counter */
  union {
    struct {  /* (when open) */
      UpVal *next;  /* linked list */
      int touched;  /* mark to avoid cycles with dead threads */
    } open;
    TValue value;  /* the value (when closed) */
  } u;
};


typedef struct UpVal UpVal;
```

An `UpVal` is open if it is in the scope of the execution flow, in which case the
`UpVal.v` field points to the stack slot holding the current value of the
upvalue.

An `UpVal` is closed if it is out of the scope of the execution flow, in which
case the `UpVal.u.value` field holds the final value of the upvalue and the
`UpVal.v` field points to the `UpVal.u.value` field.

\
The `LClosure.p` field is a pointer to a `Proto` struct:
```
typedef struct Proto {
  CommonHeader;
  TValue *k;  /* constants used by the function */
  Instruction *code;
  struct Proto **p;  /* functions defined inside the function */
  int *lineinfo;  /* map from opcodes to source lines (debug information) */
  LocVar *locvars;  /* information about local variables (debug information) */
  Upvaldesc *upvalues;  /* upvalue information */
  union Closure *cache;  /* last created closure with this prototype */
  TString  *source;  /* used for debug information */
  int sizeupvalues;  /* size of 'upvalues' */
  int sizek;  /* size of `k' */
  int sizecode;
  int sizelineinfo;
  int sizep;  /* size of `p' */
  int sizelocvars;
  int linedefined;
  int lastlinedefined;
  GCObject *gclist;
  lu_byte numparams;  /* number of fixed parameters */
  lu_byte is_vararg;
  lu_byte maxstacksize;  /* maximum stack used by this function */
} Proto;
```

The `Proto.code` field is an array of VM instructions.

The `Proto.p` field is an array of pointers to `Proto` structs of the closure's
sub-closures. Inside the `luaY_parser` function, the main closure's `LClosure`
struct is created. During parsing source code, pointers to `Proto` structs of
sub-closures are added to the main closure's `Proto.p` array.

After parsing of source code is done, the main closure's `LClosure` struct is
on stack. The `handle_script` function calls `docall`, which calls `lua_pcall`,
which calls `lua_pcallk`, which calls `luaD_pcall`, which calls
`luaD_rawrunprotected`, which calls `f_call`, which calls `luaD_callnoyield`,
which calls `luaD_call`.

`luaD_call` calls `luaD_precall` to prepare the call. If the target closure is
a `CClosure`, it gets called immediately. If the target closure is a
`LClosure`, a `CallInfo` struct is created to describe the closure call:
```
typedef struct CallInfo {
  StkId func;  /* function index in the stack */
  StkId top;  /* top for this function */
  struct CallInfo *previous, *next;  /* dynamic call link */
  union {
    struct {  /* only for Lua functions */
      StkId base;  /* base for this function */
      const Instruction *savedpc;
    } l;
    struct {  /* only for C functions */
      lua_KFunction k;  /* continuation in case of yields */
      ptrdiff_t old_errfunc;
      lua_KContext ctx;  /* context info. in case of yields */
    } c;
  } u;
  ptrdiff_t extra;
  short nresults;  /* expected number of results from this function */
  unsigned short callstatus;
} CallInfo;
```

The `CallInfo.l.base` is the offset base for stack indexes used in the target
closure.

The `CallInfo.func` field is index (offset from `CallInfo.l.base`) of the stack
slot holding the target closure.

The `CallInfo.l.savedpc` points to the next VM instruction of the target
closure.

`luaD_precall` sets `L-ci` to point to the `CallInfo`.

`luaD_call` then calls `luaV_execute`. `luaV_execute` gets the current
`CallInfo` from `L-ci`, and start running the target closure's VM instructions.

\
When source code defines a function, the corresponding VM instruction is
`OP_CLOSURE`. The handling code in `luaV_execute` is:
```
vmcase(OP_CLOSURE) {
  Proto *p = cl->p->p[GETARG_Bx(i)];
  LClosure *ncl = getcached(p, cl->upvals, base);  /* cached closure */
  if (ncl == NULL)  /* no match? */
    pushclosure(L, p, cl->upvals, base, ra);  /* create a new one */
  else
    setclLvalue(L, ra, ncl);  /* push cashed closure */
  checkGC(L, ra + 1);
  vmbreak;
}
```
The sub-closure's `Proto` struct pointer is obtained from the current closure's
`Proto.p` array. The `pushclosure` function creates a new `LClosure` for the
sub-closure and set its `LClosure.p` field to point to the obtained `Proto`
struct.

The `pushclosure` function then initializes the sub-closure's `LClosure.upvals`
field (an `UpVal` pointer array), for upvalues used in the sub-closure.
Depending on whether an upvalue is defined in a parent closure or an ancestor
closure, the `UpVal` struct pointer is obtained from the parent closure's
`UpVal` pointer array, or by calling `luaF_findupval`, respectively,

\
When source code calls a function, the corresponding VM instruction is
`OP_CALL`. The handling code in `luaV_execute` is:
```
vmcase(OP_CALL) {
  int b = GETARG_B(i);
  int nresults = GETARG_C(i) - 1;
  if (b != 0) L->top = ra+b;  /* else previous instruction set top */
  if (luaD_precall(L, ra, nresults)) {  /* C function? */
    if (nresults >= 0)
      L->top = ci->top;  /* adjust results */
    Protect((void)0);  /* update 'base' */
  }
  else {  /* Lua function */
    ci = L->ci;
    goto newframe;  /* restart luaV_execute over new Lua function */
  }
  vmbreak;
}
```

The stack index of the closure to call is encoded in the `OP_CALL`
instruction's `RA` field, which is put in `luaV_execute`'s `ra` variable.
`luaD_precall` is called to create a new `CallInfo` and sets `L-ci` to point to
it. `luaV_execute`'s `ci` variable is set to point to the new `CallInfo`. Then
the `goto newframe` statement causes the VM to start running the target
closure's instructions.

\
When source code returns from a function, the corresponding VM instruction is
`OP_RETURN`. The handling code in `luaV_execute` is:
```
vmcase(OP_RETURN) {
  int b = GETARG_B(i);
  if (cl->p->sizep > 0) luaF_close(L, base);
  b = luaD_poscall(L, ci, ra, (b != 0 ? b - 1 : cast_int(L->top - ra)));
  if (ci->callstatus & CIST_FRESH)  /* local 'ci' still from callee */
    return;  /* external invocation: return */
  else {  /* invocation via reentry: continue execution */
    ci = L->ci;
    if (b) L->top = ci->top;
    lua_assert(isLua(ci));
    lua_assert(GET_OPCODE(*((ci)->u.l.savedpc - 1)) == OP_CALL);
    goto newframe;  /* restart luaV_execute over new Lua function */
  }
}
```

The `luaD_poscall` function is called. `L.ci` is set to point to the parent
closure's `CallInfo`. `luaV_execute`'s `ci` variable is set to point to the
parent closure's `CallInfo`. Then the `goto newframe` statement causes the VM
to start running the parent closure's next instruction pointed to by
`CallInfo.l.savedpc`.
