--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: C how variable length array is implemented

author: Aoik

create_time: 2018-09-19 20:00:00

tags:
    - c
    - gcc
    - variable-length-array

post_id: 2

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# C how variable length array is implemented
In C language, a variable length array (VLA) is an array whose length is not a
constant expression. For example:
```
int a = 0xAA;
int items[a];
```
In this case, the array `items`' length is a variable.

[GCC has support for VLA](https://gcc.gnu.org/onlinedocs/gcc/Variable-Length.html).
To see how VLA is implemented, we can compile a C program that has used VLA and
examine the result assembly code.

The test environment is:
- CentOS 7.4
- Linux kernel 3.10.0-862.el7.x86_64
- GCC 4.8.5

First of all, create a C source code file `vla_demo.c`:
```
void f() {
    int a = 0xAA;
    int items[a];
    int b = 0xBB;
    items[1] = 0xFF;
}

int main()
{
    f();
}
```

Then compile it to binary program:
```
gcc -O0 vla_demo.c -o vla_demo
```

Then get the assembly code from the binary program:
```
objdump -d vla_demo
```

Below is the assembly code of the function `f`:
```
# 5DJX6: Push the caller's base address to stack.
push   %rbp

# Use the stack top address as the new base address.
mov    %rsp,%rbp

# Reserve space for all regular variables,
# plus the VLA max index variable (`-0x10(%rbp)` in this case),
# plus the VLA start address variable (`-0x18(%rbp)` in this case).
sub    $0x20,%rsp

# Move stack top address to rax.
mov    %rsp,%rax

# 3ZTLA: Move stack top address in rax to r8.
# Aim to be restored at 6MSRF.
mov    %rax,%r8

# Move the array length `0xaa` to variable `a`.
movl   $0xaa,-0x4(%rbp)

# Move the array length in variable `a` to eax.
# Variable `a` is an int so only 32-bit `eax` is used.
mov    -0x4(%rbp),%eax

# Move the array length in eax to r9
movslq %eax,%r9

# Subtract the array length in r9 by 1.
# Now r9 holds the VLA max index.
sub    $0x1,%r9

# Move the VLA max index to the VLA max index variable.
# The VLA max index variable is located at the first address after the
# variables defined before the VLA statement, that can hold 8 bytes and is
# 8-byte aligned.
mov    %r9,-0x10(%rbp)

# Move the array length in eax to r9
movslq %eax,%r9

# Move the array length in r9 to rsi
mov    %r9,%rsi

# Move 0 to edi
mov    $0x0,%edi

# Move the array length in eax to rsi
movslq %eax,%rsi

# Move the array length in rsi to rdx
mov    %rsi,%rdx

# Move 0 to ecx
mov    $0x0,%ecx

# Sign-extends eax to rax. The array length should be a positive value so the
# higher 32 bits of rax should be 0.
cltq

# Left-shift the array length in rax by 2 bits, equivalently multiplying it by
# 4. This converts the array length (number of ints) to array space size
# (number of bytes).
shl    $0x2,%rax

# Move the number of bytes `0x3(%rax)` to rdx.
# The extra 3 bytes aim to round up the value below.
lea    0x3(%rax),%rdx

# Move 16 to eax
mov    $0x10,%eax

# Subtract rax by 1. Now rax holds 15.
sub    $0x1,%rax

# Add the number of bytes `0x3(%rax)` in rdx to 15.
# This aims to round up the value below.
add    %rdx,%rax

# Move 16 to ecx.
mov    $0x10,%ecx

# Move 0 to edx.
mov    $0x0,%edx

# Divide the number of bytes `0x3(%rax) + 15` in rdx:rax by 16 in rcx, store
# quotient in rax, remainder in rdx.
# Now rax holds the number of 16-byte blocks required.
div    %rcx

# Multiply the number of 16-byte blocks in rax by 16.
# Now rax holds the 16-byte aligned number of bytes required.
imul   $0x10,%rax,%rax

# Subtract stack top address by the 16-byte aligned number of bytes in rax.
# This reserves space for the VLA.
sub    %rax,%rsp

# Move stack top address to rax.
mov    %rsp,%rax

# Round up the stack top address in rax to be 4-byte aligned.
# Now rax holds the VLA start address.
add    $0x3,%rax
shr    $0x2,%rax
shl    $0x2,%rax

# Move the VLA start address in rax to the VLA start address variable.
mov    %rax,-0x18(%rbp)

# Move value `0xbb` to variable `b`.
movl   $0xbb,-0x1c(%rbp)

# Move the VLA start address to rax.
mov    -0x18(%rbp),%rax

# Move value `0xff` to `items[1]`.
movl   $0xff,0x4(%rax)

# 6MSRF: Restore stack top address in r8 (stored at 3ZTLA).
mov    %r8,%rsp

# Move RBP to RSP so that the stack top is the caller's RBP pushed at 5DJX6.
# Pop stack top value into RBP to restore the caller's RBP.
leaveq

# Return to the caller.
retq
```

What happens is that the number of bytes of an VLA is computed at run time and
the stack top pointer is modified to reserve space for the VLA. There is a
variable holding the start address of the VLA. The VLA's elements are addressed
via this variable.
