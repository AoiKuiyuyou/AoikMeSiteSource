--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python's compiler - from grammar to dfa

author: Aoik

create_time: 2019-05-06 20:00:00

tags:
    - python
    - compiler
    - parser
    - parser-generator
    - pgen
    - source-code-study
    - 吸星大法强吃源码

post_id: 30

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python's compiler - from grammar to dfa
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
Python's grammar is LL(1). Instead of using a top-down recursive descent parser, Python uses a DFA-based (Pushdown Automata, more precisely) parser. In Python 3.7, the parser generator **pgen** ([Parser/pgenmain.c](https://github.com/python/cpython/blob/v3.7.0/Parser/pgenmain.c), [Parser/pgen.c](https://github.com/python/cpython/blob/v3.7.0/Parser/pgen.c)) is responsible for parsing the grammar file [Grammar/Grammar](https://github.com/python/cpython/blob/v3.7.0/Grammar/Grammar) into DFA transition diagram, stored as files [Include/graminit.h](https://github.com/python/cpython/blob/v3.7.0/Include/graminit.h) and [Python/graminit.c](https://github.com/python/cpython/blob/v3.7.0/Python/graminit.c). The DFA transition diagram is then used by the DFA-based parser to parse Python code.

To parse the [Grammar/Grammar](https://github.com/python/cpython/blob/v3.7.0/Grammar/Grammar) file, **pgen** uses the same DFA-based parser that parses Python code. The only difference is the DFA transition diagram used, which is defined in [Parser/metagrammar.c](https://github.com/python/cpython/blob/v3.7.0/Parser/metagrammar.c#L142). This file is generated using the meta-grammar of the [Grammar/Grammar](https://github.com/python/cpython/blob/v3.7.0/Grammar/Grammar) file. Although the meta-grammar file is not present in Python's reporsitory, by examining functions with initial `compile_` in [Parser/pgen.c](https://github.com/python/cpython/blob/v3.7.0/Parser/pgen.c#L180), we can infer the meta-grammar as:
```
MSTART: (NEWLINE | RULE)* ENDMARKER
RULE: NAME ':' RHS NEWLINE
RHS: ALT ('|' ALT)*
ALT: ITEM+
ITEM: '[' RHS ']' | ATOM ['*' | '+']
ATOM: NAME | STRING | '(' RHS ')'
```

In Python 3.7, besides the C version of **pgen**, there is a Python version [Lib/lib2to3/pgen2](https://github.com/python/cpython/tree/v3.7.0/Lib/lib2to3/pgen2) that works similarly.

In Python 3.8, the C version of **pgen** has been replaced by a Python version [Parser/pgen](https://github.com/python/cpython/tree/v3.8.0/Parser/pgen), which is slightly modified from Python 3.7's [Lib/lib2to3/pgen2](https://github.com/python/cpython/tree/v3.7.0/Lib/lib2to3/pgen2).

In Python 3.8, assuming the working directory is Python's repository directory, the command to generate [Include/graminit.h](https://github.com/python/cpython/blob/v3.8.0/Include/graminit.h) and [Python/graminit.c](https://github.com/python/cpython/blob/v3.8.0/Python/graminit.c) is:
```
# Linux
export PYTHONPATH=Parser

# Windows
SET PYTHONPATH=Parser

python -m pgen Grammar/Grammar Grammar/Tokens Include/graminit.h Python/graminit.c
```

\
**pgen**'s calling sequence:
```
pgen.__main__.main

    pgen.ParserGenerator.__init__
    
        pgen.ParserGenerator.parse
        
            pgen.ParserGenerator.make_dfa
            
            pgen.ParserGenerator.simplify_dfa
        
        pgen.ParserGenerator.addfirstsets
    
    pgen.ParserGenerator.make_grammar
    
        pgen.grammar.Grammar.__init__
        
    pgen.grammar.Grammar.produce_graminit_h
    
    pgen.grammar.Grammar.produce_graminit_c
```

\
[Parser/pgen/pgen.py](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py):
```
import collections
import tokenize  # from stdlib

from . import grammar, token


class ParserGenerator(object):

    def __init__(self, grammar_file, token_file, stream=None, verbose=False):
        close_stream = None

        if stream is None:
            stream = open(grammar_file)
            close_stream = stream.close

        with open(token_file) as tok_file:
            token_lines = tok_file.readlines()

        # Map terminal symbol name to terminal symbol number.
        self.tokens = dict(token.generate_tokens(token_lines))

        # Map operator text to operator name.
        self.opmap = dict(token.generate_opmap(token_lines))

        # Manually add <> so it does not collide with !=
        self.opmap['<>'] = "NOTEQUAL"
        self.verbose = verbose
        self.filename = grammar_file
        self.stream = stream
        self.generator = tokenize.generate_tokens(stream.readline)
        self.gettoken() # Initialize lookahead

        # `self.dfas` maps non-terminal symbol name to DFAState objects list.
        self.dfas, self.startsymbol = self.parse()

        if close_stream is not None:
            close_stream()

        # Map non-terminal symbol name to first set of label indexes.
        self.first = {} # map from symbol name to set of tokens

        self.addfirstsets()

    def make_grammar(self):
        c = grammar.Grammar()

        # Get non-terminal symbol names.
        names = list(self.dfas.keys())

        # Put the starting symbol in the front.
        names.remove(self.startsymbol)
        names.insert(0, self.startsymbol)

        # For each non-terminal symbol name.
        for name in names:
            # Allocate symbol number.
            # Non-terminal symbol numbers start with 256.
            i = 256 + len(c.symbol2number)
            # 5IWPC
            # Store the mapping from non-terminal symbol name to symbol number.
            c.symbol2number[name] = i
            # Store the mapping from non-terminal symbol number to symbol name.
            c.number2symbol[i] = name

        # For each non-terminal symbol name.
        for name in names:
            # Allocate label.
            self.make_label(c, name)

            # Get the non-terminal's DFA.
            # `dfa` is a DFAState objects list
            dfa = self.dfas[name]

            # The the non-terminal's DFA's states list.
            # Each state is an arcs list.
            states = []

            # For the non-terminal's DFA's each state.
            # `state` is a DFAState object
            for state in dfa:
                # `arcs` is a list of pairs.
                # Each pair's first item is label index.
                # Each pair's second item is the next state index.
                arcs = []
                # `label` is the grammar item.
                # `next` is the next `DFAState` object.
                for label, next in sorted(state.arcs.items()):
                    arcs.append((self.make_label(c, label), dfa.index(next)))
                if state.isfinal:
                    arcs.append((0, dfa.index(state)))
                states.append(arcs)

            # 5V13N
            # Store the mapping from non-terminal symbol number minus 256 to
            # its DFA node's states list.
            c.states.append(states)
            # 3KER2
            # Store the mapping from non-terminal symbol number to its DFA
            # node's states list and first set.
            c.dfas[c.symbol2number[name]] = (states, self.make_first(c, name))

        # Store the starting symbol number.
        c.start = c.symbol2number[self.startsymbol]

        if self.verbose:
            print("")
            print("Grammar summary")
            print("===============")

            print("- {n_labels} labels".format(n_labels=len(c.labels)))
            print("- {n_dfas} dfas".format(n_dfas=len(c.dfas)))
            print("- {n_tokens} tokens".format(n_tokens=len(c.tokens)))
            print("- {n_keywords} keywords".format(n_keywords=len(c.keywords)))
            print(
                "- Start symbol: {start_symbol}".format(
                    start_symbol=c.number2symbol[c.start]
                )
            )
        return c

    def make_first(self, c, name):
        # Get non-terminal's first set in terms of grammar items.
        rawfirst = self.first[name]

        # The non-terminal's first set in terms of label indexes.
        first = set()

        # For each grammar item.
        for label in sorted(rawfirst):
            # Get the grammar item's label index.
            ilabel = self.make_label(c, label)

            ##assert ilabel not in first # XXX failed on <> ... !=
            first.add(ilabel)

        return first

    def make_label(self, c, label):
        # XXX Maybe this should be a method on a subclass of converter?

        # `label` is a grammar item.
        # `make_label` adds a label tuple (symbol number, keyword text) to
        # `c.labels` for each distinct grammar item. The index into `c.labels`
        # represents the grammar item in the generated grammar structure's
        # arcs.

        # Get label index.
        ilabel = len(c.labels)
        # If the first character is alpha, then `label` is either a
        # non-terminal symbol name or a named token (e.g. NAME, NUMBER,
        # STRING).
        if label[0].isalpha():
            # Either a symbol name or a named token
            # A non-terminal symbol name.
            if label in c.symbol2number:
                # A symbol name (a non-terminal)
                # If label has been allocated.
                if label in c.symbol2label:
                    # Return the label index.
                    return c.symbol2label[label]
                else:
                    # 6SFOH
                    # Add a tuple (symbol number, None).
                    c.labels.append((c.symbol2number[label], None))
                    # 3UWQN
                    # Store the mapping from symbol number to label index.
                    c.symbol2label[label] = ilabel
                    # Return the label index.
                    return ilabel
            # A named token.
            else:
                # A named token (NAME, NUMBER, STRING)
                # Get terminal symbol number.
                itoken = self.tokens.get(label, None)
                assert isinstance(itoken, int), label
                assert itoken in self.tokens.values(), label
                # If label has been allocated.
                if itoken in c.tokens:
                    return c.tokens[itoken]
                else:
                    # 6SFOH
                    # Add a label tuple (terminal symbol number, None).
                    c.labels.append((itoken, None))

                    # 6FHBO
                    # Store the mapping from terminal symbol number to label
                    # index.
                    c.tokens[itoken] = ilabel
                    return ilabel
        # If the first character is not alpha, then `label` is either a keyword
        # or an operator.
        else:
            # Either a keyword or an operator
            assert label[0] in ('"', "'"), label
            value = eval(label)
            # If it is a keyword.
            if value[0].isalpha():
                # A keyword
                # If label has been allocated.
                if value in c.keywords:
                    # Return the label index.
                    return c.keywords[value]
                else:
                    # 6SFOH
                    # Add a label tuple (terminal symbol NAME's number, keyword
                    # text).
                    c.labels.append((self.tokens["NAME"], value))

                    # 7W5Z2
                    # Store the mapping from keyword text to label index.
                    c.keywords[value] = ilabel

                    # Return the label index.
                    return ilabel
            # If it is an operator.
            else:
                # An operator (any non-numeric token)
                # Get terminal symbol name.
                tok_name = self.opmap[value] # Fails if unknown token

                # Get terminal symbol number.
                itoken = self.tokens[tok_name]

                # If label has been allocated.
                if itoken in c.tokens:
                    # Return the label index.
                    return c.tokens[itoken]
                else:
                    # 6SFOH
                    # Add a label tuple (terminal symbol number, None).
                    c.labels.append((itoken, None))

                    # 6FHBO
                    # Store the mapping from terminal symbol number to label
                    # index.
                    c.tokens[itoken] = ilabel

                    # Return the label index.
                    return ilabel

    def addfirstsets(self):
        names = list(self.dfas.keys())
        for name in names:
            if name not in self.first:
                self.calcfirst(name)

            if self.verbose:
                print("First set for {dfa_name}".format(dfa_name=name))
                for item in self.first[name]:
                    print("    - {terminal}".format(terminal=item))

    def calcfirst(self, name):
        dfa = self.dfas[name]
        self.first[name] = None # dummy to detect left recursion
        # Get the DFA's first state.
        # The first state's arcs' labels belong to the first set.
        state = dfa[0]
        totalset = set()
        overlapcheck = {}
        for label, next in state.arcs.items():
            # If the label is non-terminal name.
            if label in self.dfas:
                if label in self.first:
                    fset = self.first[label]
                    if fset is None:
                        raise ValueError("recursion for rule %r" % name)
                else:
                    # Calculate the non-terminal's first set.
                    self.calcfirst(label)
                    fset = self.first[label]
                totalset.update(fset)
                overlapcheck[label] = fset
            # If the label is terminal.
            else:
                totalset.add(label)
                overlapcheck[label] = {label}
        inverse = {}
        for label, itsfirst in overlapcheck.items():
            for symbol in itsfirst:
                if symbol in inverse:
                    raise ValueError("rule %s is ambiguous; %s is in the"
                                     " first sets of %s as well as %s" %
                                     (name, symbol, label, inverse[symbol]))
                inverse[symbol] = label
        self.first[name] = totalset

    def parse(self):
        # Grammar:
        # MSTART: (NEWLINE | RULE)* ENDMARKER
        # RULE: NAME ':' RHS NEWLINE
        # RHS: ALT ('|' ALT)*
        # ALT: ITEM+
        # ITEM: '[' RHS ']' | ATOM ['*' | '+']
        # ATOM: NAME | STRING | '(' RHS ')'

        # Map non-terminal symbol name to DFAState objects list.
        dfas = collections.OrderedDict()

        # The starting symbol name.
        startsymbol = None

        # MSTART: (NEWLINE | RULE)* ENDMARKER
        while self.type != tokenize.ENDMARKER:
            while self.type == tokenize.NEWLINE:
                self.gettoken()
            # RULE: NAME ':' RHS NEWLINE
            name = self.expect(tokenize.NAME)
            if self.verbose:
                print("Processing rule {dfa_name}".format(dfa_name=name))
            self.expect(tokenize.OP, ":")
            a, z = self.parse_rhs()
            self.expect(tokenize.NEWLINE)
            if self.verbose:
                self.dump_nfa(name, a, z)
            dfa = self.make_dfa(a, z)
            if self.verbose:
                self.dump_dfa(name, dfa)
            self.simplify_dfa(dfa)
            dfas[name] = dfa
            if startsymbol is None:
                startsymbol = name
        return dfas, startsymbol

    def make_dfa(self, start, finish):
        # To turn an NFA into a DFA, we define the states of the DFA
        # to correspond to *sets* of states of the NFA.  Then do some
        # state reduction.  Let's represent sets as dicts with 1 for
        # values.
        assert isinstance(start, NFAState)
        assert isinstance(finish, NFAState)
        def closure(state):
            base = set()
            addclosure(state, base)
            return base
        def addclosure(state, base):
            assert isinstance(state, NFAState)
            if state in base:
                return
            base.add(state)
            for label, next in state.arcs:
                if label is None:
                    addclosure(next, base)
        # DFAState objects list.
        # Each DFAState contains a set of NFAState objects and their epsilon closure NFAState objects.
        states = [DFAState(closure(start), finish)]
        for state in states: # NB states grows while we're iterating
            # Map label to next state's NFAState objects set.
            arcs = {}
            # Code below does non-epsilon transition from the current DFAState's NFAState objects set to the next states.
            # For current DFAState's each NFAState.
            for nfastate in state.nfaset:
                # For the NFAState's each arc.
                for label, next in nfastate.arcs:
                    # If the arc is non-epsilon.
                    if label is not None:
                        # Add the next NFAState's closure NFAState objects to the set for the label.
                        addclosure(next, arcs.setdefault(label, set()))
            # For each label and the next state's NFAState objects set.
            for label, nfaset in sorted(arcs.items()):
                # For each existing DFAState.
                for st in states:
                    # If the next state's NFAState objects set equals that of an existing DFAState.
                    if st.nfaset == nfaset:
                        # Found the DFAState for the next state.
                        break
                # If the next state's NFAState objects set not equals that of any existing DFAState.
                else:
                    # Create a new DFAState for the next state.
                    st = DFAState(nfaset, finish)
                    states.append(st)
                # Add a DFA arc from the current DFAState to the next DFAState.
                state.addarc(st, label)
        return states # List of DFAState instances; first one is start

    def dump_nfa(self, name, start, finish):
        print("Dump of NFA for", name)
        todo = [start]
        for i, state in enumerate(todo):
            print("  State", i, state is finish and "(final)" or "")
            for label, next in state.arcs:
                if next in todo:
                    j = todo.index(next)
                else:
                    j = len(todo)
                    todo.append(next)
                if label is None:
                    print("    -> %d" % j)
                else:
                    print("    %s -> %d" % (label, j))

    def dump_dfa(self, name, dfa):
        print("Dump of DFA for", name)
        for i, state in enumerate(dfa):
            print("  State", i, state.isfinal and "(final)" or "")
            for label, next in sorted(state.arcs.items()):
                print("    %s -> %d" % (label, dfa.index(next)))

    def simplify_dfa(self, dfa):
        # This is not theoretically optimal, but works well enough.
        # Algorithm: repeatedly look for two states that have the same
        # set of arcs (same labels pointing to the same nodes) and
        # unify them, until things stop changing.

        # dfa is a list of DFAState instances
        changes = True
        while changes:
            changes = False
            for i, state_i in enumerate(dfa):
                for j in range(i+1, len(dfa)):
                    state_j = dfa[j]
                    if state_i == state_j:
                        #print "  unify", i, j
                        del dfa[j]
                        for state in dfa:
                            state.unifystate(state_j, state_i)
                        changes = True
                        break

    def parse_rhs(self):
        # RHS: ALT ('|' ALT)*
        a, z = self.parse_alt()
        if self.value != "|":
            return a, z
        else:
            # Head.
            aa = NFAState()
            # Tail.
            zz = NFAState()
            # One branch.
            aa.addarc(a)
            z.addarc(zz)
            while self.value == "|":
                self.gettoken()
                a, z = self.parse_alt()
                # One branch.
                aa.addarc(a)
                z.addarc(zz)
            return aa, zz

    def parse_alt(self):
        # ALT: ITEM+
        a, b = self.parse_item()
        while (self.value in ("(", "[") or
               self.type in (tokenize.NAME, tokenize.STRING)):
            c, d = self.parse_item()
            # Chain old tail to new item's head.
            b.addarc(c)
            # Use new item's tail as new tail.
            b = d
        return a, b

    def parse_item(self):
        # ITEM: '[' RHS ']' | ATOM ['+' | '*']
        if self.value == "[":
            self.gettoken()
            a, z = self.parse_rhs()
            self.expect(tokenize.OP, "]")
            # Head goes directly to tail because `[]` means optional.
            a.addarc(z)
            return a, z
        else:
            a, z = self.parse_atom()
            value = self.value
            if value not in ("+", "*"):
                return a, z
            self.gettoken()
            # `z` can go to `a` to repeat.
            z.addarc(a)
            if value == "+":
                # For `+`, `a` needs to go to `z` once.
                return a, z
            else:
                # For `*`, `a` needs not to go to `z` once.
                return a, a

    def parse_atom(self):
        # ATOM: '(' RHS ')' | NAME | STRING
        if self.value == "(":
            self.gettoken()
            a, z = self.parse_rhs()
            self.expect(tokenize.OP, ")")
            return a, z
        elif self.type in (tokenize.NAME, tokenize.STRING):
            a = NFAState()
            z = NFAState()
            a.addarc(z, self.value)
            self.gettoken()
            return a, z
        else:
            self.raise_error("expected (...) or NAME or STRING, got %s/%s",
                             self.type, self.value)

    def expect(self, type, value=None):
        if self.type != type or (value is not None and self.value != value):
            self.raise_error("expected %s/%s, got %s/%s",
                             type, value, self.type, self.value)
        value = self.value
        self.gettoken()
        return value

    def gettoken(self):
        tup = next(self.generator)
        while tup[0] in (tokenize.COMMENT, tokenize.NL):
            tup = next(self.generator)
        self.type, self.value, self.begin, self.end, self.line = tup
        # print(getattr(tokenize, 'tok_name')[self.type], repr(self.value))

    def raise_error(self, msg, *args):
        if args:
            try:
                msg = msg % args
            except Exception:
                msg = " ".join([msg] + list(map(str, args)))
        raise SyntaxError(msg, (self.filename, self.end[0],
                                self.end[1], self.line))

class NFAState(object):

    def __init__(self):
        self.arcs = [] # list of (label, NFAState) pairs

    def addarc(self, next, label=None):
        assert label is None or isinstance(label, str)
        assert isinstance(next, NFAState)
        self.arcs.append((label, next))

class DFAState(object):

    def __init__(self, nfaset, final):
        assert isinstance(nfaset, set)
        assert isinstance(next(iter(nfaset)), NFAState)
        assert isinstance(final, NFAState)
        self.nfaset = nfaset
        self.isfinal = final in nfaset
        self.arcs = {} # map from label to DFAState

    def addarc(self, next, label):
        assert isinstance(label, str)
        assert label not in self.arcs
        assert isinstance(next, DFAState)
        self.arcs[label] = next

    def unifystate(self, old, new):
        for label, next in self.arcs.items():
            if next is old:
                self.arcs[label] = new

    def __eq__(self, other):
        # Equality test -- ignore the nfaset instance variable
        assert isinstance(other, DFAState)
        if self.isfinal != other.isfinal:
            return False
        # Can't just return self.arcs == other.arcs, because that
        # would invoke this method recursively, with cycles...
        if len(self.arcs) != len(other.arcs):
            return False
        for label, next in self.arcs.items():
            if next is not other.arcs.get(label):
                return False
        return True

    __hash__ = None # For Py3 compatibility.
```

\
[Parser/pgen/grammar.py](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/grammar.py):
```
import collections


class Grammar:
    """Pgen parsing tables class.

    The instance variables are as follows:

    symbol2number -- a dict mapping symbol names to numbers.  Symbol
                     numbers are always 256 or higher, to distinguish
                     them from token numbers, which are between 0 and
                     255 (inclusive).

    number2symbol -- a dict mapping numbers to symbol names;
                     these two are each other's inverse.

    states        -- a list of DFAs, where each DFA is a list of
                     states, each state is a list of arcs, and each
                     arc is a (i, j) pair where i is a label and j is
                     a state number.  The DFA number is the index into
                     this list.  (This name is slightly confusing.)
                     Final states are represented by a special arc of
                     the form (0, j) where j is its own state number.

    dfas          -- a dict mapping symbol numbers to (DFA, first)
                     pairs, where DFA is an item from the states list
                     above, and first is a set of tokens that can
                     begin this grammar rule.

    labels        -- a list of (x, y) pairs where x is either a token
                     number or a symbol number, and y is either None
                     or a string; the strings are keywords.  The label
                     number is the index in this list; label numbers
                     are used to mark state transitions (arcs) in the
                     DFAs.

    start         -- the number of the grammar's start symbol.

    keywords      -- a dict mapping keyword strings to arc labels.

    tokens        -- a dict mapping token numbers to arc labels.

    """

    def __init__(self):
        # Map non-terminal symbol name to number.
        # Numbers start with 256.
        # Filled at 5IWPC.
        self.symbol2number = collections.OrderedDict()

        # Map non-terminal symbol number to symbol name.
        # Filled at 5IWPC.
        self.number2symbol = collections.OrderedDict()

        # Map non-terminal symbol number minus 256 to its DFA node's states
        # list.
        # Each state is an arcs list.
        # Each arc is a tuple (label_index, next_state_index),
        # Filled at 5V13N.
        self.states = []

        # Map non-terminal symbol number to its DFA node's states list and
        # first set.
        # Filled at 3KER2.
        self.dfas = collections.OrderedDict()

        # A list of pairs.
        # Each pair's first item is token index or non-terminal symbol index.
        # Each pair's second item is keyword text for NAME token.
        # The list's item indexes are label indexes, i.e. numeric references
        # to tokens and symbols.
        # Filled at 6SFOH.
        self.labels = [(0, "EMPTY")]
        
        # Map keyword text to label index.
        # Filled at 7W5Z2.
        self.keywords = collections.OrderedDict()
        
        # Map terminal symbol number to label index.
        # Token indexes are determined by the order in the `tokens` file.
        # Label indexes are into `self.labels`.
        # Filled at 6FHBO.
        self.tokens = collections.OrderedDict()
        
        # Map non-terminal symbol name to label index.
        # Label indexes are into `self.labels`.
        # Filled at 3UWQN.
        self.symbol2label = collections.OrderedDict()
        
        # The starting symbol number.
        self.start = 256

    def produce_graminit_h(self, writer):
        writer("/* Generated by Parser/pgen */\n\n")
        for number, symbol in self.number2symbol.items():
            writer("#define {} {}\n".format(symbol, number))

    def produce_graminit_c(self, writer):
        writer("/* Generated by Parser/pgen */\n\n")

        writer('#include "grammar.h"\n')
        writer("grammar _PyParser_Grammar;\n")

        self.print_dfas(writer)
        self.print_labels(writer)

        writer("grammar _PyParser_Grammar = {\n")
        writer("    {n_dfas},\n".format(n_dfas=len(self.dfas)))
        writer("    dfas,\n")
        writer("    {{{n_labels}, labels}},\n".format(n_labels=len(self.labels)))
        writer("    {start_number}\n".format(start_number=self.start))
        writer("};\n")

    def print_labels(self, writer):
        writer(
            "static const label labels[{n_labels}] = {{\n".format(n_labels=len(self.labels))
        )
        for label, name in self.labels:
            label_name = '"{}"'.format(name) if name is not None else 0
            writer(
                '    {{{label}, {label_name}}},\n'.format(
                    label=label, label_name=label_name
                )
            )
        writer("};\n")

    def print_dfas(self, writer):
        self.print_states(writer)
        writer("static const dfa dfas[{}] = {{\n".format(len(self.dfas)))
        for dfaindex, dfa_elem in enumerate(self.dfas.items()):
            symbol, (dfa, first_sets) = dfa_elem
            writer(
                '    {{{dfa_symbol}, "{symbol_name}", '.format(
                    dfa_symbol=symbol, symbol_name=self.number2symbol[symbol]
                )
                + "{n_states}, states_{dfa_index},\n".format(
                    n_states=len(dfa), dfa_index=dfaindex
                )
                + '     "'
            )

            bitset = bytearray((len(self.labels) >> 3) + 1)
            for token in first_sets:
                # `token >> 3` is the byte index containing the bit.
                # `1 << (token & 7)` is the byte value with the bit set on.
                bitset[token >> 3] |= 1 << (token & 7)
            for byte in bitset:
                writer("\\%03o" % (byte & 0xFF))
            writer('"},\n')
        writer("};\n")

    def print_states(self, write):
        for dfaindex, dfa in enumerate(self.states):
            self.print_arcs(write, dfaindex, dfa)
            write(
                "static state states_{dfa_index}[{n_states}] = {{\n".format(
                    dfa_index=dfaindex, n_states=len(dfa)
                )
            )
            for stateindex, state in enumerate(dfa):
                narcs = len(state)
                write(
                    "    {{{n_arcs}, arcs_{dfa_index}_{state_index}}},\n".format(
                        n_arcs=narcs, dfa_index=dfaindex, state_index=stateindex
                    )
                )
            write("};\n")

    def print_arcs(self, write, dfaindex, states):
        for stateindex, state in enumerate(states):
            narcs = len(state)
            write(
                "static const arc arcs_{dfa_index}_{state_index}[{n_arcs}] = {{\n".format(
                    dfa_index=dfaindex, state_index=stateindex, n_arcs=narcs
                )
            )
            for a, b in state:
                write(
                    "    {{{from_label}, {to_state}}},\n".format(
                        from_label=a, to_state=b
                    )
                )
            write("};\n")
```

\
The [pgen.ParserGenerator.parse](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L168) function parses the [Grammar/Grammar](https://github.com/python/cpython/blob/v3.8.0/Grammar/Grammar) file. It is top-down recursive descent, calling [parse_rhs](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L273), [parse_alt](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L290), [parse_item](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L300), and [parse_atom](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L320) along the way. Each of the `parse_` functions creates a starting and an ending `NFAState` objects, and these `NFAState` objects get chained together to form a NFA transition diagram. For each rule in the grammar, [pgen.ParserGenerator.make_dfa](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L193) is called with the rule's starting and ending `NFAState` objects to convert the NFA transition diagram to a DFA transition diagram. Then [pgen.ParserGenerator.simplify_dfa](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L252) is called to combine equivalent `DFAState` objects. Then [pgen.ParserGenerator.addfirstsets](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L127) is called to calculate first set of non-terminal symbols. Then [pgen.ParserGenerator.make_grammar](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L31) is called. It uses [pgen.ParserGenerator.make_label](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/pgen.py#L80) to assign numeric indexes to terminal tokens and non-terminal symbols because the resulting data structure representing the DFA transition diagram uses numeric indexes. Finally [pgen.grammar.Grammar.produce_graminit_h](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/grammar.py#L56) and [pgen.grammar.Grammar.produce_graminit_c](https://github.com/python/cpython/blob/v3.8.0/Parser/pgen/grammar.py#L61) are called to generate files [Include/graminit.h](https://github.com/python/cpython/blob/v3.8.0/Include/graminit.h) and [Python/graminit.c](https://github.com/python/cpython/blob/v3.8.0/Python/graminit.c).

\
Check out Guido's post about [the origins of pgen](http://python-history.blogspot.com/2018/05/the-origins-of-pgen.html).
