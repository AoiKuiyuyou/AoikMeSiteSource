--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: GDB step over instruction by breakpoint

author: Aoik

create_time: 2019-08-21 20:00:00

tags:
    - gdb

post_id: 39

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# GDB step over instruction by breakpoint
During debugging a 16-bit boot sector with GDB, I encountered the bug that the
built-in `si` command was unable to step over the next instruction for unknown
reason. As a workaround, I set a breakpoint on the next next instruction, then
use `continue` to step over the next instruction and stop at the next next
instruction. The python script below creates a command for doing this. Use
command `1` to step over the next instruction using the built-in `si` command.
Use command `2` to step over the next instruction by breakpoint.

**StepOverInstructionByBreakpoint.py**:
```
import gdb


class StepOverInstructionCommand(gdb.Command):

    def __init__(self):
        super().__init__(
            '1',
            gdb.COMPLETE_NONE,
            gdb.COMPLETE_NONE,
            False
        )

    def invoke(self, arg, from_tty):
        gdb.execute('si')


class StepOverInstructionByBreakpointCommand(gdb.Command):

    def __init__(self):
        super().__init__(
            '2',
            gdb.COMMAND_BREAKPOINTS,
            gdb.COMPLETE_NONE,
            False
        )

    def invoke(self, arg, from_tty):
        frame = gdb.selected_frame()
        cs = int(frame.read_register('cs'))
        pc = frame.pc()
        arch = frame.architecture()
        length = arch.disassemble(pc)[0]['length']
        next_pc = cs * 16 + pc + length
        gdb.Breakpoint('*' + str(next_pc), temporary=True)
        gdb.execute('continue')
        gdb.execute('clear *{0}'.format(hex(next_pc)))


if __name__ == '__main__':
    StepOverInstructionCommand()

    StepOverInstructionByBreakpointCommand()
```
