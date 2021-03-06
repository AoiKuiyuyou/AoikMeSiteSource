--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python's compiler - the grammar file is not LL(1) but the parser is

author: Aoik

create_time: 2019-05-12 20:00:00

tags:
    - python
    - compiler
    - parser
    - parser-generator
    - pgen

post_id: 31

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python's compiler - the grammar file is not LL(1) but the parser is
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
Python's grammar is LL(1), but its [grammar file](https://github.com/python/cpython/blob/v3.8.0/Grammar/Grammar) is not. Take one rule in the grammar file
for example:
```
arglist: argument (',' argument)* [',']
```
This rule aims to parse one or more arguments, separated by comma, and optionally ended by a trailing comma. Although the rule is easy to understand, it does not work well with a regular LL(1) parser. The `(',' argument)*` and `[',']` parts are both optional, and both start with the comma token. With a regular LL(1) parser, after parsing the first `argument` non-terminal symbol, as long as there is a comma token, the parser will enter the `(',' argument)*` part, and will expect a following `argument` symbol. The `[',']` part will never be entered, and as a result trailing comma syntax like `[1, 2,]` can not be supported.

But Python does support the trailing comma syntax. How is that possible? The answer is that Python uses a DFA-based (Pushdown Automata, more precisely) parser. The grammar file is first converted to NFA using the [McNaughton-Yamada-Thompson algorithm](https://en.wikipedia.org/wiki/Thompson%27s_construction). Then the NFA is converted to DFA using the [powerset construction algorithm](https://en.wikipedia.org/wiki/Powerset_construction) (a.k.a. subset construction).

Let's say the starting and ending NFA nodes for the first `argument` in the rule above is **a** and **b**, the starting and ending NFA nodes for the `(',' argument)*` part is **c** and **d**, and the starting and ending NFA nodes for the `[',']` part is **e** and **f**. There are epsilon (i.e. empty, not consuming a token) arcs b->c and d->e. And because both the `(',' argument)*` and `[',']` parts are optional, there are epsilon arcs c->d, e->f, and thus b->e, b->f, d->f.

For input `1`, the parsing transition is a-->b->f. (`-->` means non-epsilon transition.)

For input `1,`, the parsing transition is a-->b->e-->f.

For input `1, 2`, the parsing transition is a-->b->c-->d->f.

For input `1, 2,`, the parsing transition is a-->b->c-->d->e-->f.

As we can see, after converting to NFA, the rule works as intended.

We can use Python's parser generator [pgen](https://github.com/python/cpython/tree/v3.8.0/Parser/pgen) to generate the DFA to verify what is described above is true. First create a simplified grammar file **grammar.txt** with the following content:
```
arglist: NUMBER (',' NUMBER)*  [',']
```

In [Python 3.8.0](https://github.com/python/cpython/tree/v3.8.0)'s repository directory, run:
```
# Linux
export PYTHONPATH=Parser

# Windows
SET PYTHONPATH=Parser

python -m pgen grammar.txt Grammar/Tokens graminit.h graminit.c
```

The resulting **graminit.c** file's content is:
```
/* Generated by Parser/pgen */

#include "pgenheaders.h"
#include "grammar.h"
grammar _PyParser_Grammar;
static arc arcs_0_0[1] = {
    {2, 1},
};
static arc arcs_0_1[2] = {
    {3, 2},
    {0, 1},
};
static arc arcs_0_2[2] = {
    {2, 1},
    {0, 2},
};
static state states_0[3] = {
    {1, arcs_0_0},
    {2, arcs_0_1},
    {2, arcs_0_2},
};
static dfa dfas[1] = {
    {256, "arglist", 3, states_0,
     "\004"},
};
static label labels[4] = {
    {0, "EMPTY"},
    {256, 0},
    {2, 0},
    {12, 0},
};
grammar _PyParser_Grammar = {
    1,
    dfas,
    {4, labels},
    256
};
```

The DFA has only one state, i.e. `states_0` for the non-terminal symbol `arglist`. `states_0` has 3 nodes `arcs_0_0`, `arcs_0_1`, and `arcs_0_2`.

The `{2, 1}` in `arcs_0_0` means in the current node, if the current token is `labels[2]`, then goes to state `arcs_0_1`. The `{0, 1}` in `arcs_0_1` means it is a finishable node.

The `labels` array contains labels for all the tokens and non-terminal symbols. `0` is a special label to mean the node is finishable. `256` is for `arglist`. According to [Grammar/Tokens](https://github.com/python/cpython/blob/v3.8.0/Grammar/Tokens), `2` is for NUMBER, `12` is for COMMA.

In `_PyParser_Grammar`, the `256` means the starting non-terminal symbol is `arglist`, which corresponds to state `states_0`, thus the starting node is `states_0`'s first node `arcs_0_0`.

For input `1`, the parsing transition is: arcs_0_0 -> labels[2] (NUMBER) -> arcs_0_1 -> labels[0] (finish).

For input `1,`, the parsing transition is: arcs_0_0 -> labels[2] (NUMBER) -> arcs_0_1 -> labels[3] (COMMA) -> arcs_0_2 -> labels[0] (finish).

For input `1, 2`, the parsing transition is: arcs_0_0 -> labels[2] (NUMBER) -> arcs_0_1 -> labels[3] (COMMA) -> arcs_0_2 -> labels[2] (NUMBER) -> arcs_0_1 -> labels[0] (finish).

For input `1, 2,`, the parsing transition is: arcs_0_0 -> labels[2] (NUMBER) -> arcs_0_1 -> labels[3] (COMMA) -> arcs_0_2 -> labels[2] (NUMBER) -> arcs_0_1 -> labels[3] (COMMA) -> arcs_0_2 -> labels[0] (finish).

One might wonder, nodes like `arcs_0_1` and `arcs_0_2` are finishable, but can also transit to another node. So how does the parser decide to finish or to continue when in a finishable node? The answer is in the [PyParser_AddToken](https://github.com/python/cpython/blob/v3.8.0/Parser/parser.c#L231) function that, given a token, transits the DFA. It decides to finish parsing for a non-terminal symbol only if the current node is finishable and can not transit to another node with the current token.

Back to the start it is stated Python's grammar (not the grammar file) is LL(1). Is it true? My opinion is that because Python's parser parses by transiting DFA and creating CST nodes along the way, and because the [PyParser_AddToken](https://github.com/python/cpython/blob/v3.8.0/Parser/parser.c#L231) function that transits the DFA only peeks one token ahead, it is LL(1).
