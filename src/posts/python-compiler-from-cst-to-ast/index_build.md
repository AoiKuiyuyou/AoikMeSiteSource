--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Python's compiler - from CST to AST

author: Aoik

create_time: 2019-10-28 20:00:00

tags:
    - python
    - compiler
    - parser
    - cst
    - ast
    - source-code-study
    - 吸星大法强吃源码

post_id: 49

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Python's compiler - from CST to AST
**Python's compiler series:**
- [Python 3.8.0 execution flow](/blog/posts/python-3.8.0-execution-flow)
- [Python's compiler - from grammar to DFA](/blog/posts/python-compiler-from-grammar-to-dfa)
- [Python's compiler - the grammar file is not LL(1) but the parser is](/blog/posts/python-compiler-the-grammar-file-is-not-ll1-but-the-parser-is)
- [Python's compiler - from tokens to CST](/blog/posts/python-compiler-from-tokens-to-cst)
- [Python's compiler - from CST to AST](/blog/posts/python-compiler-from-cst-to-ast)
- [Python's compiler - from AST to code object](/blog/posts/python-compiler-from-ast-to-code-object)
- [Python's compiler - from code object to pyc file](/blog/posts/python-compiler-from-code-object-to-pyc-file)

## Use ASDL to define AST
Python's AST nodes' data structures are defined using the [ASDL](http://asdl.sourceforge.net/) (Zephyr Abstract Syntax Definition Language) file [Parser/Python.asdl](https://github.com/python/cpython/blob/v3.8.0/Parser/Python.asdl).

The grammar of the ASDL file is:
```
module        ::= "module" Id "{" [definitions] "}"
definitions   ::= { TypeId "=" type }
type          ::= product | sum
product       ::= fields ["attributes" fields]
fields        ::= "(" { field, "," } field ")"
field         ::= TypeId ["?" | "*"] [Id]
sum           ::= constructor { "|" constructor } ["attributes" fields]
constructor   ::= ConstructorId [fields]
```
- Lowercase names are non-terminals.
- Uppercase names are terminals.
- Literal tokens are in double quotes.
- `[]` means zero or one.
- `{}` means one or more.

## Parse ASDL file to ASDL AST
[Parser/asdl.py](https://github.com/python/cpython/blob/v3.8.0/Parser/asdl.py) parses the ASDL file to an ASDL AST (not to be confused with Python's AST).

A modified version of [Parser/asdl.py](https://github.com/python/cpython/blob/v3.8.0/Parser/asdl.py) that pretty prints the ASDL AST:
```
#-------------------------------------------------------------------------------
# Parser for ASDL [1] definition files. Reads in an ASDL description and parses
# it into an AST that describes it.
#
# The EBNF we're parsing here: Figure 1 of the paper [1]. Extended to support
# modules and attributes after a product. Words starting with Capital letters
# are terminals. Literal tokens are in "double quotes". Others are
# non-terminals. Id is either TokenId or ConstructorId.
#
# module        ::= "module" Id "{" [definitions] "}"
# definitions   ::= { TypeId "=" type }
# type          ::= product | sum
# product       ::= fields ["attributes" fields]
# fields        ::= "(" { field, "," } field ")"
# field         ::= TypeId ["?" | "*"] [Id]
# sum           ::= constructor { "|" constructor } ["attributes" fields]
# constructor   ::= ConstructorId [fields]
#
# [1] "The Zephyr Abstract Syntax Description Language" by Wang, et. al. See
#     http://asdl.sourceforge.net/
#-------------------------------------------------------------------------------
from collections import namedtuple
import re

__all__ = [
    'builtin_types', 'parse', 'AST', 'Module', 'Type', 'Constructor',
    'Field', 'Sum', 'Product', 'VisitorBase', 'Check', 'check']

# The following classes define nodes into which the ASDL description is parsed.
# Note: this is a "meta-AST". ASDL files (such as Python.asdl) describe the AST
# structure used by a programming language. But ASDL files themselves need to be
# parsed. This module parses ASDL files and uses a simple AST to represent them.
# See the EBNF at the top of the file to understand the logical connection
# between the various node types.

builtin_types = {'identifier', 'string', 'bytes', 'int', 'object', 'singleton',
                 'constant'}

def indent(text, step='  '):
    return step + ('\n' + step).join(text.split('\n'))

def repr_list(items):
    if not items:
        return '[]'
    lines = []
    lines.append('[\n')
    for item in items:
        item_repr = repr(item)
        item_repr = indent(item_repr) + ',\n'
        lines.append(item_repr)
    lines.append(']')
    return ''.join(lines)

class AST:
    def __repr__(self):
        raise NotImplementedError

class Module(AST):
    def __init__(self, name, dfns):
        self.name = name
        self.dfns = dfns
        self.types = {type.name: type.value for type in dfns}

    def __repr__(self):
        return 'Module({0}, {1})'.format(self.name, repr_list(self.dfns))

class Type(AST):
    def __init__(self, name, value):
        self.name = name
        self.value = value

    def __repr__(self):
        body_str = indent(repr(self.value))
        return 'Type({0}\n{1}\n)'.format(self.name, body_str)

class Constructor(AST):
    def __init__(self, name, fields=None):
        self.name = name
        self.fields = fields or []

    def __repr__(self):
        return 'Constructor({0}, {1})'.format(self.name, repr_list(self.fields))

class Field(AST):
    def __init__(self, type, name=None, seq=False, opt=False):
        self.type = type
        self.name = name
        self.seq = seq
        self.opt = opt

    def __repr__(self):
        if self.seq:
            extra = ", seq=True"
        elif self.opt:
            extra = ", opt=True"
        else:
            extra = ""
        if self.name is None:
            return 'Field({0.type}{1})'.format(self, extra)
        else:
            return 'Field({0.type}, {0.name}{1})'.format(self, extra)

class Sum(AST):
    def __init__(self, types, attributes=None):
        self.types = types
        self.attributes = attributes or []

    def __repr__(self):
        if self.attributes:
            return 'Sum({0},\n{1})'.format(
                repr_list(self.types),
                repr_list(self.attributes),
            )
        else:
            return 'Sum({0})'.format(repr_list(self.types))

class Product(AST):
    def __init__(self, fields, attributes=None):
        self.fields = fields
        self.attributes = attributes or []

    def __repr__(self):
        if self.attributes:
            return 'Product({0},\n{1})'.format(
                repr_list(self.fields),
                repr_list(self.attributes),
            )
        else:
            return 'Product({0})'.format(repr_list(self.fields))

# A generic visitor for the meta-AST that describes ASDL. This can be used by
# emitters. Note that this visitor does not provide a generic visit method, so a
# subclass needs to define visit methods from visitModule to as deep as the
# interesting node.
# We also define a Check visitor that makes sure the parsed ASDL is well-formed.

class VisitorBase(object):
    """Generic tree visitor for ASTs."""
    def __init__(self):
        self.cache = {}

    def visit(self, obj, *args):
        klass = obj.__class__
        meth = self.cache.get(klass)
        if meth is None:
            methname = "visit" + klass.__name__
            meth = getattr(self, methname, None)
            self.cache[klass] = meth
        if meth:
            try:
                meth(obj, *args)
            except Exception as e:
                print("Error visiting %r: %s" % (obj, e))
                raise

class Check(VisitorBase):
    """A visitor that checks a parsed ASDL tree for correctness.

    Errors are printed and accumulated.
    """
    def __init__(self):
        super(Check, self).__init__()
        self.cons = {}
        self.errors = 0
        self.types = {}

    def visitModule(self, mod):
        for dfn in mod.dfns:
            self.visit(dfn)

    def visitType(self, type):
        self.visit(type.value, str(type.name))

    def visitSum(self, sum, name):
        for t in sum.types:
            self.visit(t, name)

    def visitConstructor(self, cons, name):
        key = str(cons.name)
        conflict = self.cons.get(key)
        if conflict is None:
            self.cons[key] = name
        else:
            print('Redefinition of constructor {}'.format(key))
            print('Defined in {} and {}'.format(conflict, name))
            self.errors += 1
        for f in cons.fields:
            self.visit(f, key)

    def visitField(self, field, name):
        key = str(field.type)
        l = self.types.setdefault(key, [])
        l.append(name)

    def visitProduct(self, prod, name):
        for f in prod.fields:
            self.visit(f, name)

def check(mod):
    """Check the parsed ASDL tree for correctness.

    Return True if success. For failure, the errors are printed out and False
    is returned.
    """
    v = Check()
    v.visit(mod)

    for t in v.types:
        if t not in mod.types and not t in builtin_types:
            v.errors += 1
            uses = ", ".join(v.types[t])
            print('Undefined type {}, used in {}'.format(t, uses))
    return not v.errors

# The ASDL parser itself comes next. The only interesting external interface
# here is the top-level parse function.

def parse(filename):
    """Parse ASDL from the given file and return a Module node describing it."""
    with open(filename) as f:
        parser = ASDLParser()
        return parser.parse(f.read())

# Types for describing tokens in an ASDL specification.
class TokenKind:
    """TokenKind is provides a scope for enumerated token kinds."""
    (ConstructorId, TypeId, Equals, Comma, Question, Pipe, Asterisk,
     LParen, RParen, LBrace, RBrace) = range(11)

    operator_table = {
        '=': Equals, ',': Comma,    '?': Question, '|': Pipe,    '(': LParen,
        ')': RParen, '*': Asterisk, '{': LBrace,   '}': RBrace}

Token = namedtuple('Token', 'kind value lineno')

class ASDLSyntaxError(Exception):
    def __init__(self, msg, lineno=None):
        self.msg = msg
        self.lineno = lineno or '<unknown>'

    def __str__(self):
        return 'Syntax error on line {0.lineno}: {0.msg}'.format(self)

def tokenize_asdl(buf):
    """Tokenize the given buffer. Yield Token objects."""
    for lineno, line in enumerate(buf.splitlines(), 1):
        for m in re.finditer(r'\s*(\w+|--.*|.)', line.strip()):
            c = m.group(1)
            if c[0].isalpha():
                # Some kind of identifier
                if c[0].isupper():
                    yield Token(TokenKind.ConstructorId, c, lineno)
                else:
                    yield Token(TokenKind.TypeId, c, lineno)
            elif c[:2] == '--':
                # Comment
                break
            else:
                # Operators
                try:
                    op_kind = TokenKind.operator_table[c]
                except KeyError:
                    raise ASDLSyntaxError('Invalid operator %s' % c, lineno)
                yield Token(op_kind, c, lineno)

class ASDLParser:
    """Parser for ASDL files.

    Create, then call the parse method on a buffer containing ASDL.
    This is a simple recursive descent parser that uses tokenize_asdl for the
    lexing.
    """
    def __init__(self):
        self._tokenizer = None
        self.cur_token = None

    def parse(self, buf):
        """Parse the ASDL in the buffer and return an AST with a Module root.
        """
        self._tokenizer = tokenize_asdl(buf)
        self._advance()
        return self._parse_module()

    def _parse_module(self):
        if self._at_keyword('module'):
            self._advance()
        else:
            raise ASDLSyntaxError(
                'Expected "module" (found {})'.format(self.cur_token.value),
                self.cur_token.lineno)
        name = self._match(self._id_kinds)
        self._match(TokenKind.LBrace)
        defs = self._parse_definitions()
        self._match(TokenKind.RBrace)
        return Module(name, defs)

    def _parse_definitions(self):
        defs = []
        while self.cur_token.kind == TokenKind.TypeId:
            typename = self._advance()
            self._match(TokenKind.Equals)
            type = self._parse_type()
            defs.append(Type(typename, type))
        return defs

    def _parse_type(self):
        if self.cur_token.kind == TokenKind.LParen:
            # If we see a (, it's a product
            return self._parse_product()
        else:
            # Otherwise it's a sum. Look for ConstructorId
            sumlist = [Constructor(self._match(TokenKind.ConstructorId),
                                   self._parse_optional_fields())]
            while self.cur_token.kind  == TokenKind.Pipe:
                # More constructors
                self._advance()
                sumlist.append(Constructor(
                                self._match(TokenKind.ConstructorId),
                                self._parse_optional_fields()))
            return Sum(sumlist, self._parse_optional_attributes())

    def _parse_product(self):
        return Product(self._parse_fields(), self._parse_optional_attributes())

    def _parse_fields(self):
        fields = []
        self._match(TokenKind.LParen)
        while self.cur_token.kind == TokenKind.TypeId:
            typename = self._advance()
            is_seq, is_opt = self._parse_optional_field_quantifier()
            id = (self._advance() if self.cur_token.kind in self._id_kinds
                                  else None)
            fields.append(Field(typename, id, seq=is_seq, opt=is_opt))
            if self.cur_token.kind == TokenKind.RParen:
                break
            elif self.cur_token.kind == TokenKind.Comma:
                self._advance()
        self._match(TokenKind.RParen)
        return fields

    def _parse_optional_fields(self):
        if self.cur_token.kind == TokenKind.LParen:
            return self._parse_fields()
        else:
            return None

    def _parse_optional_attributes(self):
        if self._at_keyword('attributes'):
            self._advance()
            return self._parse_fields()
        else:
            return None

    def _parse_optional_field_quantifier(self):
        is_seq, is_opt = False, False
        if self.cur_token.kind == TokenKind.Asterisk:
            is_seq = True
            self._advance()
        elif self.cur_token.kind == TokenKind.Question:
            is_opt = True
            self._advance()
        return is_seq, is_opt

    def _advance(self):
        """ Return the value of the current token and read the next one into
            self.cur_token.
        """
        cur_val = None if self.cur_token is None else self.cur_token.value
        try:
            self.cur_token = next(self._tokenizer)
        except StopIteration:
            self.cur_token = None
        return cur_val

    _id_kinds = (TokenKind.ConstructorId, TokenKind.TypeId)

    def _match(self, kind):
        """The 'match' primitive of RD parsers.

        * Verifies that the current token is of the given kind (kind can
          be a tuple, in which the kind must match one of its members).
        * Returns the value of the current token
        * Reads in the next token
        """
        if (isinstance(kind, tuple) and self.cur_token.kind in kind or
            self.cur_token.kind == kind
            ):
            value = self.cur_token.value
            self._advance()
            return value
        else:
            raise ASDLSyntaxError(
                'Unmatched {} (found {})'.format(kind, self.cur_token.kind),
                self.cur_token.lineno)

    def _at_keyword(self, keyword):
        return (self.cur_token.kind == TokenKind.TypeId and
                self.cur_token.value == keyword)
```

The usage:
```
import asdl
asdl_ast = asdl.parse('Python.asdl')
print(asdl_ast)
```

The ASDL AST of [Parser/Python.asdl](https://github.com/python/cpython/blob/v3.8.0/Parser/Python.asdl):
```
Module(Python, [
  Type(mod
    Sum([
      Constructor(Module, [
        Field(stmt, body, seq=True),
        Field(type_ignore, type_ignores, seq=True),
      ]),
      Constructor(Interactive, [
        Field(stmt, body, seq=True),
      ]),
      Constructor(Expression, [
        Field(expr, body),
      ]),
      Constructor(FunctionType, [
        Field(expr, argtypes, seq=True),
        Field(expr, returns),
      ]),
      Constructor(Suite, [
        Field(stmt, body, seq=True),
      ]),
    ])
  ),
  Type(stmt
    Sum([
      Constructor(FunctionDef, [
        Field(identifier, name),
        Field(arguments, args),
        Field(stmt, body, seq=True),
        Field(expr, decorator_list, seq=True),
        Field(expr, returns, opt=True),
        Field(string, type_comment, opt=True),
      ]),
      Constructor(AsyncFunctionDef, [
        Field(identifier, name),
        Field(arguments, args),
        Field(stmt, body, seq=True),
        Field(expr, decorator_list, seq=True),
        Field(expr, returns, opt=True),
        Field(string, type_comment, opt=True),
      ]),
      Constructor(ClassDef, [
        Field(identifier, name),
        Field(expr, bases, seq=True),
        Field(keyword, keywords, seq=True),
        Field(stmt, body, seq=True),
        Field(expr, decorator_list, seq=True),
      ]),
      Constructor(Return, [
        Field(expr, value, opt=True),
      ]),
      Constructor(Delete, [
        Field(expr, targets, seq=True),
      ]),
      Constructor(Assign, [
        Field(expr, targets, seq=True),
        Field(expr, value),
        Field(string, type_comment, opt=True),
      ]),
      Constructor(AugAssign, [
        Field(expr, target),
        Field(operator, op),
        Field(expr, value),
      ]),
      Constructor(AnnAssign, [
        Field(expr, target),
        Field(expr, annotation),
        Field(expr, value, opt=True),
        Field(int, simple),
      ]),
      Constructor(For, [
        Field(expr, target),
        Field(expr, iter),
        Field(stmt, body, seq=True),
        Field(stmt, orelse, seq=True),
        Field(string, type_comment, opt=True),
      ]),
      Constructor(AsyncFor, [
        Field(expr, target),
        Field(expr, iter),
        Field(stmt, body, seq=True),
        Field(stmt, orelse, seq=True),
        Field(string, type_comment, opt=True),
      ]),
      Constructor(While, [
        Field(expr, test),
        Field(stmt, body, seq=True),
        Field(stmt, orelse, seq=True),
      ]),
      Constructor(If, [
        Field(expr, test),
        Field(stmt, body, seq=True),
        Field(stmt, orelse, seq=True),
      ]),
      Constructor(With, [
        Field(withitem, items, seq=True),
        Field(stmt, body, seq=True),
        Field(string, type_comment, opt=True),
      ]),
      Constructor(AsyncWith, [
        Field(withitem, items, seq=True),
        Field(stmt, body, seq=True),
        Field(string, type_comment, opt=True),
      ]),
      Constructor(Raise, [
        Field(expr, exc, opt=True),
        Field(expr, cause, opt=True),
      ]),
      Constructor(Try, [
        Field(stmt, body, seq=True),
        Field(excepthandler, handlers, seq=True),
        Field(stmt, orelse, seq=True),
        Field(stmt, finalbody, seq=True),
      ]),
      Constructor(Assert, [
        Field(expr, test),
        Field(expr, msg, opt=True),
      ]),
      Constructor(Import, [
        Field(alias, names, seq=True),
      ]),
      Constructor(ImportFrom, [
        Field(identifier, module, opt=True),
        Field(alias, names, seq=True),
        Field(int, level, opt=True),
      ]),
      Constructor(Global, [
        Field(identifier, names, seq=True),
      ]),
      Constructor(Nonlocal, [
        Field(identifier, names, seq=True),
      ]),
      Constructor(Expr, [
        Field(expr, value),
      ]),
      Constructor(Pass, []),
      Constructor(Break, []),
      Constructor(Continue, []),
    ],
    [
      Field(int, lineno),
      Field(int, col_offset),
      Field(int, end_lineno, opt=True),
      Field(int, end_col_offset, opt=True),
    ])
  ),
  Type(expr
    Sum([
      Constructor(BoolOp, [
        Field(boolop, op),
        Field(expr, values, seq=True),
      ]),
      Constructor(NamedExpr, [
        Field(expr, target),
        Field(expr, value),
      ]),
      Constructor(BinOp, [
        Field(expr, left),
        Field(operator, op),
        Field(expr, right),
      ]),
      Constructor(UnaryOp, [
        Field(unaryop, op),
        Field(expr, operand),
      ]),
      Constructor(Lambda, [
        Field(arguments, args),
        Field(expr, body),
      ]),
      Constructor(IfExp, [
        Field(expr, test),
        Field(expr, body),
        Field(expr, orelse),
      ]),
      Constructor(Dict, [
        Field(expr, keys, seq=True),
        Field(expr, values, seq=True),
      ]),
      Constructor(Set, [
        Field(expr, elts, seq=True),
      ]),
      Constructor(ListComp, [
        Field(expr, elt),
        Field(comprehension, generators, seq=True),
      ]),
      Constructor(SetComp, [
        Field(expr, elt),
        Field(comprehension, generators, seq=True),
      ]),
      Constructor(DictComp, [
        Field(expr, key),
        Field(expr, value),
        Field(comprehension, generators, seq=True),
      ]),
      Constructor(GeneratorExp, [
        Field(expr, elt),
        Field(comprehension, generators, seq=True),
      ]),
      Constructor(Await, [
        Field(expr, value),
      ]),
      Constructor(Yield, [
        Field(expr, value, opt=True),
      ]),
      Constructor(YieldFrom, [
        Field(expr, value),
      ]),
      Constructor(Compare, [
        Field(expr, left),
        Field(cmpop, ops, seq=True),
        Field(expr, comparators, seq=True),
      ]),
      Constructor(Call, [
        Field(expr, func),
        Field(expr, args, seq=True),
        Field(keyword, keywords, seq=True),
      ]),
      Constructor(FormattedValue, [
        Field(expr, value),
        Field(int, conversion, opt=True),
        Field(expr, format_spec, opt=True),
      ]),
      Constructor(JoinedStr, [
        Field(expr, values, seq=True),
      ]),
      Constructor(Constant, [
        Field(constant, value),
        Field(string, kind, opt=True),
      ]),
      Constructor(Attribute, [
        Field(expr, value),
        Field(identifier, attr),
        Field(expr_context, ctx),
      ]),
      Constructor(Subscript, [
        Field(expr, value),
        Field(slice, slice),
        Field(expr_context, ctx),
      ]),
      Constructor(Starred, [
        Field(expr, value),
        Field(expr_context, ctx),
      ]),
      Constructor(Name, [
        Field(identifier, id),
        Field(expr_context, ctx),
      ]),
      Constructor(List, [
        Field(expr, elts, seq=True),
        Field(expr_context, ctx),
      ]),
      Constructor(Tuple, [
        Field(expr, elts, seq=True),
        Field(expr_context, ctx),
      ]),
    ],
    [
      Field(int, lineno),
      Field(int, col_offset),
      Field(int, end_lineno, opt=True),
      Field(int, end_col_offset, opt=True),
    ])
  ),
  Type(expr_context
    Sum([
      Constructor(Load, []),
      Constructor(Store, []),
      Constructor(Del, []),
      Constructor(AugLoad, []),
      Constructor(AugStore, []),
      Constructor(Param, []),
    ])
  ),
  Type(slice
    Sum([
      Constructor(Slice, [
        Field(expr, lower, opt=True),
        Field(expr, upper, opt=True),
        Field(expr, step, opt=True),
      ]),
      Constructor(ExtSlice, [
        Field(slice, dims, seq=True),
      ]),
      Constructor(Index, [
        Field(expr, value),
      ]),
    ])
  ),
  Type(boolop
    Sum([
      Constructor(And, []),
      Constructor(Or, []),
    ])
  ),
  Type(operator
    Sum([
      Constructor(Add, []),
      Constructor(Sub, []),
      Constructor(Mult, []),
      Constructor(MatMult, []),
      Constructor(Div, []),
      Constructor(Mod, []),
      Constructor(Pow, []),
      Constructor(LShift, []),
      Constructor(RShift, []),
      Constructor(BitOr, []),
      Constructor(BitXor, []),
      Constructor(BitAnd, []),
      Constructor(FloorDiv, []),
    ])
  ),
  Type(unaryop
    Sum([
      Constructor(Invert, []),
      Constructor(Not, []),
      Constructor(UAdd, []),
      Constructor(USub, []),
    ])
  ),
  Type(cmpop
    Sum([
      Constructor(Eq, []),
      Constructor(NotEq, []),
      Constructor(Lt, []),
      Constructor(LtE, []),
      Constructor(Gt, []),
      Constructor(GtE, []),
      Constructor(Is, []),
      Constructor(IsNot, []),
      Constructor(In, []),
      Constructor(NotIn, []),
    ])
  ),
  Type(comprehension
    Product([
      Field(expr, target),
      Field(expr, iter),
      Field(expr, ifs, seq=True),
      Field(int, is_async),
    ])
  ),
  Type(excepthandler
    Sum([
      Constructor(ExceptHandler, [
        Field(expr, type, opt=True),
        Field(identifier, name, opt=True),
        Field(stmt, body, seq=True),
      ]),
    ],
    [
      Field(int, lineno),
      Field(int, col_offset),
      Field(int, end_lineno, opt=True),
      Field(int, end_col_offset, opt=True),
    ])
  ),
  Type(arguments
    Product([
      Field(arg, posonlyargs, seq=True),
      Field(arg, args, seq=True),
      Field(arg, vararg, opt=True),
      Field(arg, kwonlyargs, seq=True),
      Field(expr, kw_defaults, seq=True),
      Field(arg, kwarg, opt=True),
      Field(expr, defaults, seq=True),
    ])
  ),
  Type(arg
    Product([
      Field(identifier, arg),
      Field(expr, annotation, opt=True),
      Field(string, type_comment, opt=True),
    ],
    [
      Field(int, lineno),
      Field(int, col_offset),
      Field(int, end_lineno, opt=True),
      Field(int, end_col_offset, opt=True),
    ])
  ),
  Type(keyword
    Product([
      Field(identifier, arg, opt=True),
      Field(expr, value),
    ])
  ),
  Type(alias
    Product([
      Field(identifier, name),
      Field(identifier, asname, opt=True),
    ])
  ),
  Type(withitem
    Product([
      Field(expr, context_expr),
      Field(expr, optional_vars, opt=True),
    ])
  ),
  Type(type_ignore
    Sum([
      Constructor(TypeIgnore, [
        Field(int, lineno),
        Field(string, tag),
      ]),
    ])
  ),
])
```

## Compile ASDL AST to C code
[Parser/asdl_c.py](https://github.com/python/cpython/blob/v3.8.0/Parser/asdl_c.py) compiles the ASDL AST to Python's AST nodes' C data structures and processing functions, stored in files [Include/Python-ast.h](https://github.com/python/cpython/blob/v3.8.0/Include/Python-ast.h) and [Python/Python-ast.c](https://github.com/python/cpython/blob/v3.8.0/Python/Python-ast.c).

The usage:
```
python Parser/asdl_c.py -h Include/Python-ast.h Parser/Python.asdl

python Parser/asdl_c.py -h Python/Python-ast.c Parser/Python.asdl
```

For example, the ASDL AST nodes
```
Type(mod
  Sum([
    Constructor(Module, [
      Field(stmt, body, seq=True),
      Field(type_ignore, type_ignores, seq=True),
    ]),
    Constructor(Interactive, [
      Field(stmt, body, seq=True),
    ]),
    Constructor(Expression, [
      Field(expr, body),
    ]),
    Constructor(FunctionType, [
      Field(expr, argtypes, seq=True),
      Field(expr, returns),
    ]),
    Constructor(Suite, [
      Field(stmt, body, seq=True),
    ]),
  ])
)
```
are compiled to the C data structures:
```
enum _mod_kind {Module_kind=1, Interactive_kind=2, Expression_kind=3,
                 FunctionType_kind=4, Suite_kind=5};
struct _mod {
    enum _mod_kind kind;
    union {
        struct {
            asdl_seq *body;
            asdl_seq *type_ignores;
        } Module;

        struct {
            asdl_seq *body;
        } Interactive;

        struct {
            expr_ty body;
        } Expression;

        struct {
            asdl_seq *argtypes;
            expr_ty returns;
        } FunctionType;

        struct {
            asdl_seq *body;
        } Suite;

    } v;
};
```

There are AST node constructor functions defined in [Python/Python-ast.c](https://github.com/python/cpython/blob/v3.8.0/Python/Python-ast.c#L1196).
And there are constructor macros defined in [Include/Python-ast.h](https://github.com/python/cpython/blob/v3.8.0/Include/Python-ast.h#L477). Notice these macros change the corresponding constructor functions' name, e.g. the function name `Module` is changed to `_Py_Module`.

## Convert CST to AST
[Python/ast.c::PyAST_FromNodeObject](https://github.com/python/cpython/blob/v3.8.0/Python/ast.c#L772) converts a CST to AST, creating AST nodes using these constructor macros:
```
ast.c--PyAST_FromNodeObject

  switch on CST node type
  case file_input:
    # Grammar rules:
    # file_input: (NEWLINE | stmt)* ENDMARKER
    # stmt: simple_stmt | compound_stmt
    # simple_stmt : small_stmt(';' small_stmt) * [';'] NEWLINE

    asdl.c--_Py_asdl_seq_new

    for each `small_stmt` or `compound_stmt`:
      ast.c--ast_for_stmt

      asdl.h--asdl_seq_SET

    asdl.c--_Py_asdl_seq_new

    for each type ignores:
      # Create AST node.
      Python-ast.h--TypeIgnore

      asdl.h--asdl_seq_SET
    
    # Create AST node.
    Python-ast.h--Module

  case eval_input:
    ...
  case single_input:
    ...
  case func_type_input:
    ...
```

## Expose AST to Python code
[Python/ast.c](https://github.com/python/cpython/blob/v3.8.0/Python/Python-ast.c#L8771) also defines the `_ast` module, which exposes AST objects to Python code.

[Python/Python-ast.c::PyAST_mod2obj](https://github.com/python/cpython/blob/v3.8.0/Python/Python-ast.c#L8984) converts an AST (C) node to AST (Python) object.

[Python/Python-ast.c::PyAST_obj2mod](https://github.com/python/cpython/blob/v3.8.0/Python/Python-ast.c#L8992) converts an AST (Python) object to (C) node.

The Python function [ast.parse](https://github.com/python/cpython/blob/v3.8.0/Lib/ast.py#L30) parses source code to an AST object.
```
ast.parse

  builtins.compile

    bltinmodule.c.h--builtin_compile

      bltinmodule.c--builtin_compile_impl

        pythonrun.c--Py_CompileStringObject

          pythonrun.c--PyParser_ASTFromStringObject

          Python-ast.c--PyAST_mod2obj
```
