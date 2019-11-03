--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Grub4DOS WEE source code study - A20 gate

author: Aoik

create_time: 2019-08-28 20:30:00

tags:
    - grub4dos-source-code-study
    - a20-gate
    - 吸星大法强吃源码

post_id: 45

$template:
    file: root://src/posts/_base/post_page_base_no_highlight.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Grub4DOS WEE source code study - A20 gate

## a20.inc
[grubutils/wee/a20.inc](https://github.com/chenall/grubutils/blob/59b987d14741998aff5145866be8edd5d8fce24d/grubutils/wee/a20.inc):
```
/* real-mode A20 gate control code for grub4dos.
 *
 *  Copyright (C) 2010  Tinybit(tinybit@tom.com)
 *
 *  This program is free software; you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation; either version 2 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program; if not, write to the Free Software
 *  Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
 */

/* The code is based on bcopy32.c from syslinux-3.63. Here is the original
 * copyright notice:
 *
 * -----------------------------------------------------------------------
 *
 *   Copyright 1994-2008 H. Peter Anvin - All Rights Reserved
 *
 *   This program is free software; you can redistribute it and/or modify
 *   it under the terms of the GNU General Public License as published by
 *   the Free Software Foundation, Inc., 53 Temple Place Ste 330,
 *   Boston MA 02111-1307, USA; either version 2 of the License, or
 *   (at your option) any later version; incorporated herein by reference.
 *
 * -----------------------------------------------------------------------
 */

#
# Routines to enable and disable (yuck) A20.  These routines are gathered
# from tips from a couple of sources, including the Linux kernel and
# http://www.x86.org/.  The need for the delay to be as large as given here
# is indicated by Donnie Barnes of RedHat, the problematic system being an
# IBM ThinkPad 760EL.
#
# We typically toggle A20 twice for every 64K transferred.
#

#define DISABLE_CPU_CACHE   0

#define IO_DELAY_PORT   0x80        /* Invalid port (we hope!) */

# Note the skip of 2 here
# The 2-byte stepping is because the value is used as index into `A20List` and
# `A20List`'s item is 2 bytes each.
#define A20_DUNNO   0       /* A20 type unknown */
#define A20_NONE    2       /* A20 always on? */
#define A20_BIOS    4       /* A20 BIOS enable */
#define A20_KBC     6       /* A20 through KBC */
#define A20_FAST    8       /* A20 through port 92h */

    /* Align Dword here so that other alignments below could work
     * as expected.
     */

    .align  4

enable_disable_a20:

    ###################################################################
    # input:    DL=0        disable a20
    #       DL=non-zero enable a20
    #       DH=0        a20 debug off
    #       DH=non-zero a20 debug on
    #       CX=loops to try when failure
    #
    # output:   ZF=0        failed
    #       ZF=1        completed ok. If ZF=CF=1, then
    #               the A20 status needn't change and
    #               was not touched.
    #       EAX modified
    #       CX modified
    ###################################################################

    # First, see if the A20 status is already what we desired.
// Push ECX.
    pushl   %ecx
// Put 2 to ECX, to be used as try times for `a20_test_match` below.
    movl    $0x2, %ecx
// Test whether A20 is in desired state.
    call    a20_test_match
// Pop old ECX.
    popl    %ecx
    /* ZF=1(means equal) for desired and we needn't do anything. */
// If ZF is 0 which means A20 is not in desired state, jump.
    jnz 1f
// If ZF is 1 which means A20 is in desired state, put 1 to CF to indicate no
// change was made.
    stc
// Return.
    ret

assign_base_pointer:
// The `call` instruction will push the runtime address of the following
// instruction, i.e. the runtime address of `base_addr`, to stack.
    call    base_addr
base_addr:
// Pop the runtime address of `base_addr` to BP.
    popw    %bp
// Return.
    ret

1:
    /********************************************/
    /**  Now we have to enable or disable A20  **/
    /********************************************/

// Push EBP.
    pushl   %ebp
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
    /* save original EBP */
// Pop old EBP to `A20_old_ebp`.
    popl    %cs:(A20_old_ebp - base_addr)(%bp)

    /* save original return address */
// Pop return address to `A20ReturnAddress`.
    popw    %cs:(A20ReturnAddress - base_addr)(%bp)

// Store registers.
    movl    %eax, %cs:(A20_old_eax - base_addr)(%bp)
    movl    %ebx, %cs:(A20_old_ebx - base_addr)(%bp)
    movl    %ecx, %cs:(A20_old_ecx - base_addr)(%bp)
    movl    %edx, %cs:(A20_old_edx - base_addr)(%bp)
    movl    %esi, %cs:(A20_old_esi - base_addr)(%bp)
    movl    %edi, %cs:(A20_old_edi - base_addr)(%bp)

//  pushal          # save all

// Put 200 to CX, to be used as try times.
    movw    $200, %cx
// Test whether DL is 0.
    testb   %dl, %dl
// If DL is not 0 which means to enable A20, jump.
    jnz 1f
// If DL is 0 which means to disable A20, put 20 to CX, to be used as try
// times.
    movw    $20, %cx
1:

// Put the try times in CX to `A20Tries`.
    # Times to try to make this work
    movw    %cx, %cs:(A20Tries - base_addr)(%bp)

    /* save original IF, DF */
// Push EFLAGS.
    pushfw
// Pop EFLAGS to `A20Flags`.
    popw    %cs:(A20Flags - base_addr)(%bp)

a20_try_again:

    ######################################################################
    ## If the A20 type is known, jump straight to type
    ######################################################################

// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Put `A20Type` to SI.
// The initial value is `A20_DUNNO`.
    movw    %cs:(A20Type - base_addr)(%bp), %si
// Put BP to BX.
    movw    %bp, %bx
// Put routine address `A20List[SI]` to BX.
    addw    %cs:(A20List - base_addr)(%bp, %si), %bx
// Jump to the routine.
    jmp *%bx

    ######################################################################
    ## First, see if we are on a system with no A20 gate
    ######################################################################
    /*
     * If the system has no A20 gate, then we needn't enable it and could
     * return SUCCESS right now without calling A20_TEST.
     */
a20_none:
// Test whether DL is 0.
    testb   %dl, %dl
// If DL is 0 which means to disable A20, jump.
    jz  a20_done_fail
// If DL is not 0 which means to enable A20, next.
//  cmpb    %dl, %dl    # set ZF=1 for success
//  jmp a20_done

a20_dunno:
    //movb  $A20_DUNNO, %cs:(A20Type - base_addr)(%bp)
// Print.
    call    a20_debug_print

// Push ECX.
    pushl   %ecx
// Put 2 to ECX, to be used as try times for `a20_test_match` below.
    movl    $0x2, %ecx
// Test whether A20 is in desired state.
    call    a20_test_match
// Pop old ECX.
    popl    %ecx
    /* ZF=1(means equal) for desired and we needn't do anything. */
// If ZF is 1 which means A20 is in desired state, jump.
    jz  a20_done
// If ZF is 0 which means A20 is not in desired state, next.

    #######################################################
    ## Next, try the BIOS (INT 15h AX=240xh)
    #######################################################
a20_bios:
#if 0
    /* dell hangs on the A20 BIOS call, so we avoid calling it. */

// Test whether DL is 0.
    testb   %dl, %dl
// If DL is 0 which means to disable A20, jump.
    jz  1f

// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Put `$A20_BIOS` to `A20Type`.
    movb    $A20_BIOS, %cs:(A20Type - base_addr)(%bp)
// Print.
    call    a20_debug_print
1:
// Push BP.
    pushw   %bp     /* in case it is destroyed by int 15 */
// Push DX.
    pushw   %dx     /* in case it is destroyed by int 15 */
// Push EFLAGS.
    pushfw          # Some BIOSes muck with IF

// Test whether DL is 0.
    testb   %dl, %dl
// Put ~ZF to AL.
    setnz   %al
// Put 0x24 to AH to specify interrupt 0x15 AH=0x24 service.
    movb    $0x24, %ah

.ifdef int13_handler
.ifdef ROM_int15
    /* we are inside asm.S */
// Push EFLAGS.
    pushfw
// Call `ROM_int15`.
    lcall   %cs:*(ROM_int15 - int13_handler)
.else
// Invoke interrupt 0x15 AH=0x24 service.
    int $0x15
.endif
.else
// Invoke interrupt 0x15 AH=0x24 service.
    int $0x15
.endif

// Pop old EFLAGS.
    popfw
// Pop old DX.
    popw    %dx
// Pop old BP.
    popw    %bp

// Push ECX.
    pushl   %ecx
// Put 2 to ECX, to be used as try times for `a20_test_match` below.
    movl    $0x2, %ecx
// Test whether A20 is in desired state.
    call    a20_test_match
// Pop old ECX.
    popl    %ecx
    /* ZF=1(means equal) for desired and we needn't do anything. */
// If ZF is 1 which means A20 is in desired state, jump.
    jz  a20_done
// If ZF is 0 which means A20 is not in desired state, next.
#endif
    #######################################################
    ## Enable the keyboard controller A20 gate
    #######################################################
a20_kbc:
// Empty 8042 controller's input and output buffers.
    call    empty_8042

// Push EFLAGS.
    pushfw          # ZF=0 indicates there is no 8042
// Push ECX.
    pushl   %ecx
// Put 2 to ECX, to be used as try times for `a20_test_match` below.
    movl    $0x2, %ecx
// Test whether A20 is in desired state.
    call    a20_test_match
// Pop old ECX.
    popl    %ecx
// Pop old EFLAGS to AX.
    popw    %ax     # flags
    /* ZF=1(means equal) for desired and we needn't do anything. */
// If ZF is 1 which means A20 is in desired state, jump.
    jz  a20_done    # A20 live, no need to use KBC
// If ZF is 0 which means A20 is not in desired state, next.

// Push old EFLAGS in AX.
    pushw   %ax     # flags
// Pop old EFLAGS.
    popfw
// If ZF is 0 which means no 8042 controller, jump.
    jnz a20_fast    # failure, no 8042, try next
// If ZF is 1 which means have 8042 controller, next.

// Test whether DL is 0.
    testb   %dl, %dl
// If DL is 0 which means to disable A20, jump.
    jz  1f
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Put `$A20_KBC` to `A20Type`.
    movb    $A20_KBC, %cs:(A20Type - base_addr)(%bp)
// Print.
    call    a20_debug_print
1:
// Put 0xD1 to AL.
    movb    $0xD1, %al  # 8042 command byte to write output port
// Put 0xD1 to port 0x64.
    outb    %al, $0x64  # write command to port 64h
// Empty 8042 controller's input and output buffers.
    call    empty_8042

// Put 0xDD to AL.
    movb    $0xDD, %al  # 0xDD is for disable, 0xDF is for enable
// Test whether DL is 0.
    testb   %dl, %dl
// Put ~ZF to AH.
    setne   %ah
// Left-shift AH by 1.
    shlb    $1, %ah
// Merge AH to AL.
    orb %ah, %al
// Put AL to port 0x60.
    outb    %al, $0x60
// Empty 8042 controller's input and output buffers.
    call    empty_8042

// Push ECX.
    pushl   %ecx
// Put 2 to ECX, to be used as try times for `a20_test_match` below.
    movl    $0x2, %ecx
// Test whether A20 is in desired state.
    call    a20_test_match
// Pop old ECX.
    popl    %ecx
    /* ZF=1(means equal) for desired and we needn't do anything. */
// Push EFLAGS.
    pushfw          # ZF=1 for "A20 is OK"

    /* output a dummy command (USB keyboard hack) */
// Put 0xFF to AL.
    movb    $0xFF, %al
// Put 0xFF to port 0x64.
    outb    %al, $0x64
// Empty 8042 controller's input and output buffers.
    call    empty_8042

// Pop old EFLAGS.
    popfw           # ZF=1 for "A20 is OK"
// If ZF is 1 which means A20 is in desired state, jump.
    jz  a20_done    # A20 live, no need to use KBC
// If ZF is 0 which means A20 is not in desired state, next.

// Push ECX.
    pushl   %ecx
// Put 2 to ECX, to be used as try times for `a20_test_match` below.
    movl    $0x2, %ecx  # 0x200000 is too big
// Test whether A20 is in desired state.
    call    a20_test_match
// Pop ECX.
    popl    %ecx
    /* ZF=1(means equal) for desired and we needn't do anything. */
// If ZF is 1 which means A20 is in desired state, jump.
    jz  a20_done
// If ZF is 0 which means A20 is not in desired state, next.

    ######################################################################
    ## Fast A20 Gate: System Control Port A
    ######################################################################

a20_fast:
// Put port 0x92 to AL.
    inb $0x92, %al
// Test whether DL is 0.
    testb   %dl, %dl
// If DL is 0 which means to disable A20, jump.
    jz  2f
    /* enable a20 */
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Put `$A20_FAST` to `A20Type`.
    movb    $A20_FAST, %cs:(A20Type - base_addr)(%bp)
// Print.
    call    a20_debug_print
// Test whether bit 1 is on in AL.
    testb   $0x02, %al
// If bit 1 is on in AL, jump.
    jnz 1f      # chipset bug: do nothing if already set
// Turn on bit 1 in AL.
    orb $0x02, %al  # "fast A20" version
// Turn off bit 0 in AL.
    andb    $0xFE, %al  # don't accidentally reset the cpu
// Jump.
    jmp 3f
2:
    /* disable a20 */
// Test whether bit 1 is on in AL.
    testb   $0x02, %al
// If bit 1 is on in AL, jump.
    jz  1f      # chipset bug: do nothing if already cleared
// Turn off bits 0 and 1 in AL.
    andb    $0xFC, %al  # don't accidentally reset the cpu
3:
// Put AL to port 0x92.
    outb    %al, $0x92
1:

// Push ECX.
    pushl   %ecx
// Put 8 to ECX, to be used as try times for `a20_test_match` below.
    movl    $0x8, %ecx  # 0x200000 is too big
// Test whether A20 is in desired state.
    call    a20_test_match
// Pop old ECX.
    popl    %ecx
    /* ZF=1(means equal) for desired and we needn't do anything. */
// If ZF is 1 which means A20 is in desired state, jump.
    jz  a20_done
// If ZF is 0 which means A20 is not in desired state, next.

    #==================================================================
    #   A20 is not responding.  Try again.
    #==================================================================

    /* A20Type is now A20_FAST, so it must be reset!! */
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Put `$A20_DUNNO` to `A20Type`.
    movb    $A20_DUNNO, %cs:(A20Type - base_addr)(%bp)
// Print.
    call    a20_debug_print
// Decrement `A20Tries`.
    decw    %cs:(A20Tries - base_addr)(%bp)
// If A20Tries is not 0, jump to re-try.
    jnz a20_try_again
// If A20Tries is 0, next.

    #==================================================================
    #   Finally failed.
    #==================================================================

// Test whether DL is 0.
    testb   %dl, %dl
// If DL is not 0 which means to enable A20, jump.
    jnz a20_done_fail
// If DL is 0 which means to disable A20, next.
    /* We cannot disable it, so consider there is no A20 gate. */
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Put `$A20_NONE` to `A20Type`.
    movb    $A20_NONE, %cs:(A20Type - base_addr)(%bp)

a20_done_fail:
// Increment DX. ZF becomes 0.
    incw    %dx     # set ZF=0 for failure

a20_done:
// Push EFLAGS.
    pushfw
    /* print "done!" to show that a return was executed */
// Test whether DH is 0.
    testb   %dh, %dh
// If DH is 0 which means debug is off, jump.
    jz  1f
// If DH is 1 which means debug is on, next.
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Put `A20DbgMsgEnd`'s runtime address to SI.
    leaw    (A20DbgMsgEnd - base_addr)(%bp), %si    /* CS:SI is string */
// Print message at `A20DbgMsgEnd`.
    call    a20_print_string
1:
// Pop old EFLAGS.
    popfw
//  popal
// Restore registers.
    movl    %cs:(A20_old_eax - base_addr)(%bp), %eax
    movl    %cs:(A20_old_ebx - base_addr)(%bp), %ebx
    movl    %cs:(A20_old_ecx - base_addr)(%bp), %ecx
    movl    %cs:(A20_old_edx - base_addr)(%bp), %edx
    movl    %cs:(A20_old_esi - base_addr)(%bp), %esi
    movl    %cs:(A20_old_edi - base_addr)(%bp), %edi
// Push return address.
    pushw   %cs:(A20ReturnAddress - base_addr)(%bp)   /* return address */
// Restore EBP.
    movl    %cs:(A20_old_ebp - base_addr)(%bp), %ebp  /* restore EBP */
// Return.
    ret


//////////////////////////////////////////////////////////////////////////////
//
//  /////////////////////////////////////////////////////////
//  //
//  //  Subroutines begin here
//  //
//  /////////////////////////////////////////////////////////
//
//////////////////////////////////////////////////////////////////////////////


    ######################################################################
    ## This routine tests if A20 status matches the desired.
    ######################################################################

// Test whether A20 is in desired state.
// Input DL: 0 for A20 off, not 0 for A20 on.
// Output ZF: 0 for not in desired state, 1 for in desired state.
a20_test_match:
1:
// Test whether A20 is on.
    call    a20_test
// Push AX.
    pushw   %ax
// Put ZF to AL.
    sete    %al     /* save ZF to AL */
// Test whether DL is 0.
    testb   %dl, %dl
// Put ZF to AH.
    sete    %ah     /* save ZF to AH */
// Compare AL with AH.
// If ZF becomes 1, it means A20 is in desired state.
    cmpb    %al, %ah
// Pop old AX.
    popw    %ax
// Loop if ECX is not 0 and ZF is 0.
    /*ADDR32*/ loopnz   1b  /* dec ECX */
    /* ZF=1(means equal) for match */
// Return.
    ret

    ######################################################################
    ## This routine tests if A20 is enabled (ZF = 0).  This routine
    ## must not destroy any register contents.
    ######################################################################

// Test whether A20 is on.
// Output ZF: 0 for A20 off, 1 for A20 on.
a20_test:

    /******************************************************************/
    /* Don't call a20_debug_print! The A20_tmp_ variables are shared! */
    /******************************************************************/

// Push EBP.
    pushl   %ebp
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Pop old EBP to `A20_tmp_ebp`.
    /* save original EBP */
    popl    %cs:(A20_tmp_ebp - base_addr)(%bp)

// Pop return addres to `A20_tmp_ReturnAddress`.
    /* save a20_test return address */
    popw    %cs:(A20_tmp_ReturnAddress - base_addr)(%bp)

// Store registers.
    movl    %eax, %cs:(A20_tmp_eax - base_addr)(%bp)
    movl    %ebx, %cs:(A20_tmp_ebx - base_addr)(%bp)
    movl    %ecx, %cs:(A20_tmp_ecx - base_addr)(%bp)
    movl    %edx, %cs:(A20_tmp_edx - base_addr)(%bp)
    movl    %esi, %cs:(A20_tmp_esi - base_addr)(%bp)
    movl    %edi, %cs:(A20_tmp_edi - base_addr)(%bp)
    movw    %ds, %cs:(A20_tmp_ds - base_addr)(%bp)
    movw    %es, %cs:(A20_tmp_es - base_addr)(%bp)

    //pushl %eax
    //pushw %cx
    //pushw %ds
    //pushw %es
    //pushw %si
    //pushw %di

// Push EFLAGS
    pushfw              /* save old IF, DF */

#if DISABLE_CPU_CACHE

    /* disable CPU cache for the test to work reliably. */

// Put 0 to IF to disable maskable interrupts.
    cli
// Put CR0 to EAX.
    movl    %cr0, %eax

// Push CR0 in EAX.
    pushl   %eax            /* save old cr0 */

// Turn on bit NW (not write through) and CD (cache disable) in EAX.
    orl $0x60000000, %eax   /* set CD and NW */
// Put EAX to CR0 to disable CPU cache.
    movl    %eax, %cr0
// Jump.
    jmp 1f
1:
// Put CR0 to EAX.
    movl    %cr0, %eax
// Test whether bits NW and CD are on.
    testl   $0x60000000, %eax   /* check if we can use wbinvd. */
// If both bits are off which means the CPU not supports wbinvd instruction,
// jump.
    jz  1f          /* CPU has no wbinvd instruction. */
// If the CPU supports wbinvd instruction, run wbinvd instruction to flush
// cache.
    wbinvd
// Turn off bit NW in EAX.
    andl    $0xDFFFFFFF, %eax   /* clear NW */
// Put EAX to CR0.
    movl    %eax, %cr0
// Jump.
    jmp 1f
1:
#endif
// Put 1 to IF to enable maskable interrupts.
    sti
// Put 0 to AX.
    xorw    %ax, %ax
// Put 0 to DS.
    movw    %ax, %ds    /* DS=0 */
// Put 0xFFFF to AX.
    decw    %ax
// Put 0xFFFF to ES.
    movw    %ax, %es    /* ES=0xFFFF */

// Put `0xFFF0 / 4` to CX, to be used as count for `cmpsl` below.
// `0xFFF0` is the number of bytes to compare.
// Because DI is set to 0x0010 below, comparing 0xFFF0 times will compare the
// range [0x0010, 0xFFFF].
// Dividing by 4 is because the `cmpsl` below compares 4 bytes each time.
    movw    $(0xFFF0 / 4), %cx
// Put 0 to SI.
    xorw    %si, %si
// Put 0x0010 to DI.
// FFFF:000F is the last address before overflow when A20 is disabled.
// FFFF:0010 is the first address after overflow when A20 is disabled.
    movw    $0x0010, %di
// Put 0 to DF. When DF is 0, string operations increment SI and DI.
    cld
// Compare range [0000:0000, 0000:FFEF] with range [FFFF:0010, FFFF:FFFF].
    repz cmpsl
// If not equal which means A20 is enabled, jump.
    jne 1f      /* A20 is known to be enabled */
// If equal which means A20 is probably disabled.

    /* A20 status unknown */

// Put [0000:0200] to EAX.
    movl    0x200, %eax
// Push [0000:0200] in EAX.
    pushl   %eax        /* save old int 0x80 vector */

// Put 32 to CX, to be used as loop count below.
    movw    $32, %cx    # Loop count
    //cli           /* safe to touch int 0x80 vector */
2:
// Declare a spin-wait loop.
    pause
// Increment EAX.
    incl    %eax
// Put EAX to [0000:0200].
    movl    %eax, 0x200
// Delay.
    call    delay       # Serialize, and fix delay
// Declare a spin-wait loop.
    pause
// Compare [FFFF:0210] with [0000:0200] in EAX.
// [FFFF:0210] overflows to [0000:0200] when A20 is disabled.
// If equal, ZF becomes 1.
    cmpl    %es:0x210, %eax
// Loop if CX is not 0 and ZF is 1.
    loopz   2b
// If ZF is 0, it means A20 is on.
// If ZF is 1, it means A20 is off.


// Pop old [0000:0200] to EAX.
    popl    %eax        /* restore int 0x80 vector */
// Put EAX to [0000:0200].
    movl    %eax, 0x200
1:
    //sti
    /* ZF=0(means not equal) for A20 on, ZF=1(means equal) for A20 off. */

#if DISABLE_CPU_CACHE
// Put 0 to IF to disable maskable interrupts.
    cli
// Pop old CR0 to EAX.
    popl    %eax        /* restore cr0 */
// Put old CR0 to CR0.
    movl    %eax, %cr0
// Jump.
    jmp 1f
1:
#endif

// Put (SF:ZF:0:AF:0:PF:1:CF) to AH.
    lahf            /* Load Flags into AH Register. */
                /* AH = SF:ZF:xx:AF:xx:PF:xx:CF */

// Pop old EFLAGS to EFLAGS.
    popfw           /* restore IF, DF */
// Put (SF:ZF:0:AF:0:PF:1:CF) in AH to EFLAGS.
    sahf            /* update ZF */

    //popw  %di
    //popw  %si
    //popw  %es
    //popw  %ds
    //popw  %cx
    //popl  %eax
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Restore registers.
    movl    %cs:(A20_tmp_eax - base_addr)(%bp), %eax
    movl    %cs:(A20_tmp_ebx - base_addr)(%bp), %ebx
    movl    %cs:(A20_tmp_ecx - base_addr)(%bp), %ecx
    movl    %cs:(A20_tmp_edx - base_addr)(%bp), %edx
    movl    %cs:(A20_tmp_esi - base_addr)(%bp), %esi
    movl    %cs:(A20_tmp_edi - base_addr)(%bp), %edi
    movw    %cs:(A20_tmp_ds - base_addr)(%bp), %ds
    movw    %cs:(A20_tmp_es - base_addr)(%bp), %es
    pushw   %cs:(A20_tmp_ReturnAddress - base_addr)(%bp)
    movl    %cs:(A20_tmp_ebp - base_addr)(%bp), %ebp  /* restore EBP */
// Return.
    ret

//slow_out:
//  outb    %al, %dx    # Fall through

delay:
    //pushw %ax
    //movb  $0x80, %al  /* try to write only a known value to port */
    //aam   //outb  %al, $IO_DELAY_PORT
    //aam   //outb  %al, $IO_DELAY_PORT
    //popw  %ax
// Push CX.
    pushw   %cx
// Put 8 to CX, to be used as loop count below.
    movw    $8, %cx
1:
// Declare a spin-wait loop.
    pause
// Loop if CX is not 0.
    loop    1b
// Pop old CX.
    popw    %cx
// Return.
    ret

    ######################################################################
    ##
    ## Print A20Tries, A20Type
    ##
    ######################################################################

a20_debug_print:
// Test whether DH is 0.
    testb   %dh, %dh    /* debug mode? */
// If DH is not 0 which means debug is on, jump.
    jnz 1f      /* yes, continue */
// If DH is 0 which means debug is off, next.
// Return.
    ret
1:
    //pushal
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Store registers.
    movl    %eax, %cs:(A20_tmp_eax - base_addr)(%bp)
    movl    %ebx, %cs:(A20_tmp_ebx - base_addr)(%bp)
    movl    %ecx, %cs:(A20_tmp_ecx - base_addr)(%bp)
    movl    %edx, %cs:(A20_tmp_edx - base_addr)(%bp)
    movl    %esi, %cs:(A20_tmp_esi - base_addr)(%bp)
    movl    %edi, %cs:(A20_tmp_edi - base_addr)(%bp)
    movw    %ds, %cs:(A20_tmp_ds - base_addr)(%bp)
    movw    %es, %cs:(A20_tmp_es - base_addr)(%bp)
    movw    %fs, %cs:(A20_tmp_fs - base_addr)(%bp)
    movw    %gs, %cs:(A20_tmp_gs - base_addr)(%bp)

// Put `A20Tries` to AL.
    movb    %cs:(A20Tries - base_addr)(%bp), %al        /* A20Tries */
// Convert `A20Tries` in AL to hex in AX.
    call    a20_hex
// Put `A20Tries` hex in AX to `A20DbgMsgTryHex`.
    movw    %ax, %cs:(A20DbgMsgTryHex - base_addr)(%bp) /* A20Tries */

// Put `A20Type` to AL.
    movb    %cs:(A20Type - base_addr)(%bp), %al     /* A20Type */
// Convert `A20Type` in AL to hex in AX.
    call    a20_hex
// Put `A20Type` hex in AX to `A20DbgMsgTryHex + 2`.
    movw    %ax, %cs:(A20DbgMsgTryHex - base_addr + 2)(%bp) /* A20Type */

// Put `A20DbgMsgTry`'s address to SI.
    leaw    (A20DbgMsgTry - base_addr)(%bp), %si    /* CS:SI is string */
// Print message at `A20DbgMsgTry`.
    call    a20_print_string
// Put `base_addr`'s runtime address to BP.
    call    assign_base_pointer /* BP points to base_addr */
// Restore registers.
    movl    %cs:(A20_tmp_eax - base_addr)(%bp), %eax
    movl    %cs:(A20_tmp_ebx - base_addr)(%bp), %ebx
    movl    %cs:(A20_tmp_ecx - base_addr)(%bp), %ecx
    movl    %cs:(A20_tmp_edx - base_addr)(%bp), %edx
    movl    %cs:(A20_tmp_esi - base_addr)(%bp), %esi
    movl    %cs:(A20_tmp_edi - base_addr)(%bp), %edi
    movw    %cs:(A20_tmp_ds - base_addr)(%bp), %ds
    movw    %cs:(A20_tmp_es - base_addr)(%bp), %es
    movw    %cs:(A20_tmp_fs - base_addr)(%bp), %fs
    movw    %cs:(A20_tmp_gs - base_addr)(%bp), %gs
    //popal
// Return.
    ret

    /************************************************/
    /* print ASCIZ string CS:SI (modifies AX BX SI) */
    /************************************************/
3:
// Put 0 to BX, which means page 0 for interrupt 0x10 video service.
    xorw    %bx, %bx    /* video page 0 */
// Put 0x0E to AH, which means TTY mode for interrupt 0x10 video service.
    movb    $0x0e, %ah  /* print char in AL */
// Invoke interrupt 0x10 video service to print the character in AL.
    int $0x10       /* via TTY mode */

a20_print_string:

// Put the character in [DS:SI] to AL.
// SI is incremented.
    lodsb   %cs:(%si), %al  /* get token */
// Test whether AL is 0 which means end of string.
    cmpb    $0, %al     /* end of string? */
// If AL is not 0, jump to print the next character.
    jne 3b
// If AL is 0, next.
// Return.
    ret

    /****************************************/
    /* convert AL to hex ascii number in AX */
    /****************************************/

a20_hex:
// Put AL to AH.
    movb    %al, %ah
// Right-shift AL by 4.
// Now AL stores the higher 4 bits.
    shrb    $4, %al
// Turn off higher 4 bits in AH.
// Now AH stores the lower 4 bits.
    andb    $0x0F, %ah
// Add 0x30 to AH and AL.
// 0x30 is '0'.
    orw $0x3030, %ax

    /* least significant digit in AH */
// Compare AH with '9'
    cmpb    $0x39, %ah
// If AH <= '9', jump.
    jbe 1f
// If AH > '9', add 7 to AH.
// There are 7 other characters between '9' and 'A'.
    addb    $7, %ah
1:
    /* most significant digit in AL */
// Compare AL with '9'
    cmpb    $0x39, %al
// If AL <= '9', jump.
    jbe 1f
// If AL > '9', add 7 to AL.
// There are 7 other characters between '9' and 'A'.
    addb    $7, %al
1:
// Return.
    ret

    ######################################################################
    ##
    ## Routine to empty the 8042 KBC controller. Return ZF=0 on failure.
    ##
    ######################################################################

empty_8042:
// Push ECX.
    pushl   %ecx
// Move 10000 to ECX, to be used as try times below.
    movl    $10000, %ecx    # 100000 is too big
4:
// Delay.
    call    delay

// Put port 0x64 to AL.
    inb $0x64, %al  # read 8042 status from port 64h
// Test whether bit 0 is on in AL.
    testb   $1, %al     # is output buffer(data FROM keyboard) full?
// If bit 0 is on which means keyboard output buffer is not empty, jump.
    jnz 1f      # yes, read it and discard
// If bit 0 is off which means keyboard output buffer is empty, next.
// Test whether bit 1 is on in AL.
    testb   $2, %al     # is input buffer(data TO keyboard) empty?
// If bit 1 is on which means keyboard input buffer is not empty, jump.
    jnz 2f      # no, wait until time out
// If bit 1 is off which means keyboard input buffer is empty, jump.
    jmp 3f      # both input buffer and output buffer are empty
                # success and return with ZF=1
1:
// Delay.
    call    delay       # ZF=0, DELAY should not touch flags!!
// Put port 0x60 (reading keyboard output buffer) to AL.
    inb $0x60, %al  # read output buffer and discard input
                # data/status from 8042
2:
// Loop if ECX is not 0.
    /*ADDR32*/ loop 4b  # ZF=0
                # timed out and failure, return with ZF=0
3:
// Pop old ECX.
    popl    %ecx
// Return.
    ret

    /* a20 debug message. 25 backspaces to wipe out the previous
     * "A20 Debug: XXXX trying..." message.
     */
A20DbgMsgTry:
    .ascii  "\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\bA20 Debug: "
A20DbgMsgTryHex:
    .string "XXXX trying..."        // null terminated

    /* a20 done message. 9 backspaces to wipe out the previous
     * "trying..." message.
     */
A20DbgMsgEnd:
    .string "\b\b\b\b\b\b\b\b\bdone! "  // null terminated

    .align  2

// A list of routine addresses. `A20Type` is used as the index.
A20List:
    .word   a20_dunno - base_addr
    .word   a20_none - base_addr
    .word   a20_bios - base_addr
    .word   a20_kbc - base_addr
    .word   a20_fast - base_addr
A20Type:
    .word   A20_DUNNO   // default = unknown
A20Tries:
    .word   0       // Times until giving up on A20

    /* Just in case INT 15 might have destroyed the stack... */
A20Flags:
    .word   0       // save original Flags here
A20ReturnAddress:
    .word   0       // save original return address here
A20_tmp_ReturnAddress:
    .word   0       // save a20_test return address here

    .align  4

A20_old_ebp:    .long   0
A20_old_eax:    .long   0
A20_old_ebx:    .long   0
A20_old_ecx:    .long   0
A20_old_edx:    .long   0
A20_old_esi:    .long   0
A20_old_edi:    .long   0
A20_tmp_ebp:    .long   0
A20_tmp_eax:    .long   0
A20_tmp_ebx:    .long   0
A20_tmp_ecx:    .long   0
A20_tmp_edx:    .long   0
A20_tmp_esi:    .long   0
A20_tmp_edi:    .long   0
A20_tmp_ds: .word   0
A20_tmp_es: .word   0
A20_tmp_fs: .word   0
A20_tmp_gs: .word   0

```
