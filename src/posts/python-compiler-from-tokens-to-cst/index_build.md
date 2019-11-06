--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python's compiler - from tokens to CST

author: Aoik

create_time: 2019-10-23 23:00:00

tags:
    - python
    - compiler
    - parser
    - cst
    - source-code-study
    - 吸星大法强吃源码

post_id: 47

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python's compiler - from tokens to CST
**Python's compiler series:**
- [Python 3.8.0 execution flow](/blog/posts/python-3.8.0-execution-flow)
- [Python's compiler - from grammar to DFA](/blog/posts/python-compiler-from-grammar-to-dfa)
- [Python's compiler - the grammar file is not LL(1) but the parser is](/blog/posts/python-compiler-the-grammar-file-is-not-ll1-but-the-parser-is)
- [Python's compiler - from tokens to CST](/blog/posts/python-compiler-from-tokens-to-cst)
- [Python's compiler - from CST to AST](/blog/posts/python-compiler-from-cst-to-ast)
- [Python's compiler - from AST to code object](/blog/posts/python-compiler-from-ast-to-code-object)
- [Python's compiler - from code object to pyc file](/blog/posts/python-compiler-from-code-object-to-pyc-file)

\
In Python 3.8.0, the [pgen](https://github.com/python/cpython/tree/v3.8.0/Parser/pgen) program converts the [grammar file](https://github.com/python/cpython/blob/v3.8.0/Grammar/Grammar) into DFA transition diagram, stored as files [Include/graminit.h](https://github.com/python/cpython/blob/v3.8.0/Include/graminit.h) and [Python/graminit.c](https://github.com/python/cpython/blob/v3.8.0/Python/graminit.c).

The parser uses the DFA transition diagram to parse Python source code to CST.

In function [Python/pythonrun.c::PyParser_ASTFromFileObject](https://github.com/python/cpython/blob/v3.8.0/Python/pythonrun.c#L1380), the data structure `grammar _PyParser_Grammar` defined in [Python/graminit.c](https://github.com/python/cpython/blob/v3.8.0/Python/graminit.c#L2696) that represents the DFA transition diagram is used.

In function [Parser/parser.c::PyParser_New](https://github.com/python/cpython/blob/v3.8.0/Parser/parser.c#L91), a parser state is created and the starting non-terminal's DFA is pushed to the parser state's stack.

In function [Parser/parsetok.c::parsetok](https://github.com/python/cpython/blob/v3.8.0/Parser/parsetok.c#L347), after reading a token, it is fed into function [Parser/parser.c::PyParser_AddToken](https://github.com/python/cpython/blob/v3.8.0/Parser/parser.c#L231), where the DFA on the top of the parser state's stack transits according to the token. CST nodes are created along with the transitions.


\
[Parser/parsetok.c::parsetok](https://github.com/python/cpython/blob/v3.8.0/Parser/parsetok.c#L232)
```
parsetok.c--parsetok

  parser.c--PyParser_New

  loop:
    # Get next token.
    tokenizer.c--PyTokenizer_Get

    # Transit DFA and create CST nodes.
    parser.c--PyParser_AddToken
```


\
[Parser/parser.c::PyParser_New](https://github.com/python/cpython/blob/v3.8.0/Parser/parser.c#L72)
```
parser.c--PyParser_New

  acceler.c--PyGrammar_AddAccelerators

    acceler.c--fixdfa

      acceler.c--fixstate

  # Create parser state.
  ps = (parser_state *)PyMem_MALLOC(sizeof(parser_state));

  # Store the grammar.
  ps->p_grammar = g

  # Store the CST root node.
  ps->p_tree = PyNode_New(start)

  # Reset the stack.
  s_reset(&ps->p_stack)

  # Push the starting entry to stack.
  # Each entry stores the CST node, the DFA, the in-DFA state index.
  # `PyGrammar_FindDFA` gets the DFA by the DFA ID `start`.
  # In-DFA state index starts with 0.
  s_push(&ps->p_stack, PyGrammar_FindDFA(g, start), ps->p_tree)
```


\
[Parser/acceler.c::fixstate](https://github.com/python/cpython/blob/v3.8.0/Parser/acceler.c#L62)
```
static void
fixstate(grammar *g, state *s)
{
    const arc *a;
    int k;
    int *accel;
    int nl = g->g_ll.ll_nlabels;
    s->s_accept = 0;
    // If the grammar has n labels (terminal and non-terminal symbols), create an array of n ints.
    accel = (int *) PyObject_MALLOC(nl * sizeof(int));
    if (accel == NULL) {
        fprintf(stderr, "no mem to build parser accelerators\n");
        exit(1);
    }
    for (k = 0; k < nl; k++)
        // `-1` means no next state.
        accel[k] = -1;
    a = s->s_arc;
    // For the state's each arc.
    for (k = s->s_narcs; --k >= 0; a++) {
        // Get the label index.
        int lbl = a->a_lbl;
        // Get the label object.
        const label *l = &g->g_ll.ll_label[lbl];
        // Get the symbol type.
        // Different labels may have same symbol type.
        // E.g. different keywords all have symbol type NAME.
        // Terminal symbol types are defined in `token.h`.
        // Non-terminal symbol types are defined in `graminit.h`.
        int type = l->lb_type;
        // The 7th bit will be used (at 3BJZX) as an indicator for non-terminal symbol so the number of states of a DFA is limited to 2^7 = 128.
        if (a->a_arrow >= (1 << 7)) {
            printf("XXX too many states!\n");
            continue;
        }
        // If the symbol is non-terminal.
        if (ISNONTERMINAL(type)) {
            // Get the DFA of the non-terminal.
            const dfa *d1 = PyGrammar_FindDFA(g, type);
            int ibit;
            // The symbol type for non-terminal minus NT_OFFSET is limited to 128 to keep the accelerator value within 2 bytes.
            if (type - NT_OFFSET >= (1 << 7)) {
                printf("XXX too high nonterminal number!\n");
                continue;
            }
            // For each label of the grammar.
            for (ibit = 0; ibit < g->g_ll.ll_nlabels; ibit++) {
                // If the label is in the non-terminal's first set.
                if (testbit(d1->d_first, ibit)) {
                    if (accel[ibit] != -1)
                        printf("XXX ambiguity!\n");
                    // 3BJZX
                    // The first byte's lower 7 bits store the next state index.
                    // The first byte's zero-based bit 7 stores 1 to indicate a non-terminal.
                    // The second byte stores the non-terminal symbol type minus NT_OFFSET.
                    accel[ibit] = a->a_arrow | (1 << 7) |
                        ((type - NT_OFFSET) << 8);
                }
            }
        }
        else if (lbl == EMPTY)
            s->s_accept = 1;
        else if (lbl >= 0 && lbl < nl)
            accel[lbl] = a->a_arrow;
    }
    // Get the upper bound label index that has next state, exclusive.
    while (nl > 0 && accel[nl-1] == -1)
        nl--;
    // Get the lower bound label index that has next state.
    for (k = 0; k < nl && accel[k] == -1;)
        k++;
    if (k < nl) {
        int i;
        // Create accelerator array.
        s->s_accel = (int *) PyObject_MALLOC((nl-k) * sizeof(int));
        if (s->s_accel == NULL) {
            fprintf(stderr, "no mem to add parser accelerators\n");
            exit(1);
        }
        // Set lower bound label index.
        s->s_lower = k;
        // Set upper bound label index, exclusive.
        s->s_upper = nl;
        for (i = 0; k < nl; i++, k++)
            // Set the accelerator value.
            s->s_accel[i] = accel[k];
    }
    PyObject_FREE(accel);
}
```

\
[Parser/parser.c::PyParser_AddToken](https://github.com/python/cpython/blob/v3.8.0/Parser/parser.c#L231)
```
int
PyParser_AddToken(parser_state *ps, int type, char *str,
                  int lineno, int col_offset,
                  int end_lineno, int end_col_offset,
                  int *expected_ret)
{
    int ilabel;
    int err;

    D(printf("Token %s/'%s' ... ", _PyParser_TokenNames[type], str));

    /* Find out which label this token is */
    # Get the label index of the token.
    # If the token type is NAME, it will compare the token value because keyword tokens are NAME type too.
    ilabel = classify(ps, type, str);

    if (ilabel < 0)
        return E_SYNTAX;

    /* Loop until the token is shifted or an error occurred */
    for (;;) {
        /* Fetch the current dfa and state */
        // Get current DFA.
        const dfa *d = ps->p_stack.s_top->s_dfa;

        // Get current in-DFA state.
        state *s = &d->d_state[ps->p_stack.s_top->s_state];

        // If the token's label index is within the range that might lead to the next state.
        if (s->s_lower <= ilabel && ilabel < s->s_upper) {
            // Get the next state ID.
            int x = s->s_accel[ilabel - s->s_lower];

            // If have the next state ID.
            if (x != -1) {
                // If the next state is non-terminal, then we need to push the non-terminal's DFA to stack.
                // 7th bit (0-based) indicates non-terminal. This is enforced at 3BJZX.
                if (x & (1<<7)) {
                    /* Push non-terminal */
                    // Higher byte of `x` stores the DFA index.
                    // DFA index plus NT_OFFSET gets the DFA ID.
                    // DFA_IDs are the IDs for non-terminals defined in `graminit.h`. They start with 256 (NT_OFFSET).
                    int nt = (x >> 8) + NT_OFFSET;
                    // Lower 7 bits of `x` store the next state index of current DFA after the non-terminal is popped.
                    int arrow = x & ((1<<7)-1);
                    if (nt == func_body_suite && !(ps->p_flags & PyCF_TYPE_COMMENTS)) {
                        /* When parsing type comments is not requested,
                           we can provide better errors about bad indentation
                           by using 'suite' for the body of a funcdef */
                        D(printf(" [switch func_body_suite to suite]"));
                        nt = suite;
                    }
                    // Get the non-terminal's DFA.
                    const dfa *d1 = PyGrammar_FindDFA(
                        ps->p_grammar, nt);
                    // Create a CST node for the non-terminal and add as child of current node.
                    // Set current DFA's state to the next state so that after the non-terminal is popped, we are in the next state.
                    // Push the non-terminal's CST node and DFA to stack. The new DFA starts with state 0.
                    if ((err = push(&ps->p_stack, nt, d1,
                        arrow, lineno, col_offset,
                        end_lineno, end_col_offset)) > 0) {
                        D(printf(" MemError: push\n"));
                        return err;
                    }
                    D(printf(" Push '%s'\n", d1->d_name));

                    # Continue to process the token with the new DFA.
                    continue;
                }

                // Create a CST node for the terminal token and add as child of current node. Set current DFA's state to the next state.
                // Lower 7 bits of `x` store the next state index.
                /* Shift the token */
                if ((err = shift(&ps->p_stack, type, str,
                                x, lineno, col_offset,
                                end_lineno, end_col_offset)) > 0) {
                    D(printf(" MemError: shift.\n"));
                    return err;
                }
                D(printf(" Shift.\n"));
                /* Pop while we are in an accept-only state */
                while (s = &d->d_state
                                [ps->p_stack.s_top->s_state],
                    s->s_accept && s->s_narcs == 1) {
                    D(printf("  DFA '%s', state %d: "
                             "Direct pop.\n",
                             d->d_name,
                             ps->p_stack.s_top->s_state));
                    s_pop(&ps->p_stack);
                    if (s_empty(&ps->p_stack)) {
                        D(printf("  ACCEPT.\n"));
                        return E_DONE;
                    }
                    d = ps->p_stack.s_top->s_dfa;
                }
                return E_OK;
            }
        }

        // If the token's label index does notlead to the next state.
        // If the current state is an accepting state.
        if (s->s_accept) {
            /* Pop this dfa and try again */
            s_pop(&ps->p_stack);
            D(printf(" Pop ...\n"));
            if (s_empty(&ps->p_stack)) {
                D(printf(" Error: bottom of stack.\n"));
                return E_SYNTAX;
            }
            # Continue to process the token with the new DFA.
            continue;
        }

        /* Stuck, report syntax error */
        D(printf(" Error.\n"));
        if (expected_ret) {
            if (s->s_lower == s->s_upper - 1) {
                /* Only one possible expected token */
                *expected_ret = ps->p_grammar->
                    g_ll.ll_label[s->s_lower].lb_type;
            }
            else
                *expected_ret = -1;
        }
        return E_SYNTAX;
    }
}
```
