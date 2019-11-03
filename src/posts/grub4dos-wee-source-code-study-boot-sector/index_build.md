--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Grub4DOS WEE source code study - boot sector

author: Aoik

create_time: 2019-08-20 23:50:00

tags:
    - grub4dos-source-code-study
    - boot-sector
    - 吸星大法强吃源码

post_id: 37

$template:
    file: root://src/posts/_base/post_page_base_no_highlight.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Grub4DOS WEE source code study - boot sector

## wee63start.S
[grubutils/wee/wee63start.S](https://github.com/chenall/grubutils/blob/59b987d14741998aff5145866be8edd5d8fce24d/grubutils/wee/wee63start.S):
```
/*
 *  wee63start.S -- Startup code for WEE63.MBR
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

/*
 * This program is used to generate the wee63.mbr file.
 *
 * Use the following shell command to generate the wee63.mbr file:
 *
 *  cat wee63start pre_stage2 > wee63.mbr
 *
 */

#define ASM_FILE
#include "shared.h"
#define ASM_FILE

#if defined(MBRSECTORS127)
#include "wee127/stage2_size.h"
#else
#include "stage2_size.h"
#endif

    .file   "wee63start.S"

    .text

    .globl  start, _start

start:
_start:
_start1:

    /* Tell GAS to generate 16-bit real mode instructions */

    .code16

    . = _start1 + 0x00

    /* 1 byte at offset 0x00 will be overwritten for storing the EBIOS
     * indicator later. This is safe because the jmp instruction only
     * get executed once. The write happens after the jmp instruction
     * have got executed.
     *
     * The value written would be 0x42 for EBIOS present(LBA) and 0x02
     * for non-present(CHS).
     *
     */

#if defined(FOR_ROM)
    .byte   0x55, 0xAA
    .byte   0x7F    /* ROM size in sectors. should fit the real size. */
    jmp 1f  /* ROM init routine start */
    .byte   0   /* byte is used to adjust ROM checksum */
1:
    cli     /* in order to use as less stack as possible */

    /* backup 640KB conventional memory to 4M for quit later. */

    /* save CPU registers on stack */

    pushw   %ds
    pushw   %es
    pushal

    /* fill gdt base first thing! */
    xorl    %eax, %eax
    movw    %ds, %ax
    shll    $4, %eax
    addl    $ABS_PSP(dos_gdt), %eax
    movl    %eax, ABS_PSP(dos_gdt) + 2

    /* DS=ES */

    /* Save all registers on stack, which quit_address will use to
     * restore registers after pre_stage2 calls quit.
     */

    pushw   %ds
    pushw   %es
    pushal
    //movw  %es, %bx    # save old ES to BX
    movl    ABS_PSP(a20_status), %edx

    cli
    lgdt    ABS_PSP(dos_gdt)

    /* Note for people who are tracing/debugging this program:
     *
     * This will switch to protected mode! Don't single step it!
     *
     * Set break point at restore_BIOS_environment, and go!
     */

    movl    %cr0, %eax
    orb $1, %al
    movl    %eax, %cr0

    /* Here the CPU is in protected mode. The real mode interrupt
     * vector table won't work now.
     *
     * Note that the CS segment is still 16-bit because we have not
     * reloaded CS with a 32-bit segment selector.
     */


    pushw   %cs
    .....................

# Descriptor tables
#
# NOTE: The intel manual says gdt should be sixteen bytes aligned for
# efficiency reasons.  However, there are machines which are known not
# to boot with misaligned GDTs, so alter this at your peril!  If you alter
# GDT_ENTRY_BOOT_CS (in asm/segment.h) remember to leave at least two
# empty GDT entries (one for NULL and one reserved).
#
# NOTE: On some CPUs, the GDT must be 8 byte aligned.  This is
# true for the Voyager Quad CPU card which will not boot without
# This directive.  16 byte aligment is recommended by intel.
#
    .align 16
gdt:
    /* this is the default null entry in GDT */
    .word   gdt_end - gdt - 1       # gdt limit
    .long   (GRLDR_CS * 16 + gdt - _start1) # linear address of gdt
    .word   0               # pad 2 bytes

    /* real mode data segment base=0x400000=4M */
    .word   0xFFFF  # 64K limit
    .word   0x0000  # base address bit 0-15
    .byte   0x40    # base address bit 16-23
    .byte   0x93    # Present, DPL=0, Data segment, Writable, Accessed
    .byte   0x00    # G=D=rsv=AVL=0, lo 4 bits=hi 4 bits of limit=0
    .byte   0x00    # base address bit 24-31

    /* real mode data segment base=0 */
    .word   0xFFFF  # 64K limit
    .word   0x0000  # base address bit 0-15
    .byte   0x00    # base address bit 16-23
    .byte   0x93    # Present, DPL=0, Data segment, Writable, Accessed
    .byte   0x00    # G=D=rsv=AVL=0, lo 4 bits=hi 4 bits of limit=0
    .byte   0x00    # base address bit 24-31

gdt_end:

#else
    /* No cli, we use stack! BIOS or caller usually sets SS:SP=0000:0400 */

    /* Acer will hang up on USB boot if the leading byte is 0xEB(jmp).
     * You might want to use 0x90 0x90 or 0x33 0xC0(xor AX,AX) instead.
     */
// Program entry point.
// (gdb) break *0x7C00
    jmp 1f

    . = _start1 + 0x02

    .byte   0x90    /* MS uses it to indicate a valid floppy */

    . = _start1 + 0x03

    /* if the above "jmp" get changed, here it goes. */
    //jmp   1f  /* it occupies the first 2 bytes of the OEM string. */

            /* BPB of FAT can be placed here. */
#endif
    . = _start1 + 0x5A

    .byte   0x80    /* bit0=1: disable GRLDR search on floppy */
            /* bit1=1: disable the boot of the previous MBR with
             *     invalid partition table */
            /* bit2=1: disable the feature of unconditional
             *     entrance to the command-line */
            /* bit3=1: disable geometry tune */
            /* bit7=1: disable the boot of the previous MBR prior
                   to the search for GRLDR */

    /* offset 0x5B indicates a timer counter. */

    /* 0xff indicates waiting forever,
     * other value specifies the time in seconds to wait */

    . = _start1 + 0x5B

    .byte   5

    /* a key press to wait. if AX returned from int16 equals this word,
     * the desired action will occur. */

    . = _start1 + 0x5C

    .word   0x3920      /* the space bar */

    . = _start1 + 0x5E

    .byte   0xff    /* preferred boot drive number, 0xff for no-drive(i.e., drive not defined) */
    .byte   0xff    /* preferred partition number, 0xff for whole drive(a floppy that has no partition table) */

    . = _start1 + 0x60

1:
// Put 0 to IF to disable maskable interrupts.
// (gdb) break *0x7C60
    cli
// Put 0 to BX.
    xorw    %bx, %bx
// Put 0 to SS.
    movw    %bx, %ss
// Put 1408 to SP.
    movw    $0x580, %sp     /* temp safe stack space */
// Call.
    call    1f
1:
// Pop `1b`'s runtime offset to BX.
    popw    %bx         /* Instruction Pointer of 1b */
// Put  `stage1`'s runtime offset to BX.
    subw    $(1b - _start1), %bx    /* CS:BX=_start1 */

// Right-shift BX by 4 bits.
    shrw    $4, %bx
// Put CS to AX.
    movw    %cs, %ax
// Add AX to BX.
// Now BX:0000 points to `stage1`.
// E.g. BX = 0x07C0.
    addw    %ax, %bx        /* BX:0000=_start1 */

    /* we are booted by BIOS, or whole image already loaded */

    /* Let CS:0000=_start1 */
// Push `stage1`'s segment in BX.
    pushw   %bx         /* BX:0000=_start1 */

// Push `1f`'s offset.
    #;pushw $(1f - _start1)
    .byte   0x6A, (1f - _start1)

// Return to `1f`.
    lret
    . = . - (. - _start1) / 0x80
1:
    /* CS:0000=_start1, SS:SP=0000:0580 */
/* begin characteristics distinguish this sector from others */
// Put `stage1`'s segment in BX to DS.
    .byte   0x8E, 0xDB      //movw  %bx, %ds
// Push 0x07E0.
    .byte   0x68, 0xE0, 0x07    //pushw $0x07E0
// Pop 0x07E0 to ES.
// Now ES points to the desired location to put the whole wee binary containing
// `stage1`, backup MBR, and `stage2`. The desired locations for each are:
// - stage1: 0x7E00 (31.5KB).
// - backup_mbr: 0x8000 (32KB).
// - stage2: 0x8200 (32.5KB).
    .byte   0x07            //popw  %es /* ES=0x07E0 */

// Test `stage2`'s signature bytes.
    //cmpl  $0xCE1A02B0, (wee63_signature - _start1 + 4 + STAGE2_SIZE - 4)
    .byte   0x66, 0x81, 0x3E    //cmpl
// The second operand of `cmpl`.
    .word   (wee63_signature - _start1 + STAGE2_SIZE)
                //this word is a pointer to the bootlace
                //signature near the end of pre_stage2
                //this word varies according to STAGE2_SIZE.
// The first operand of `cmpl`.
    .byte   0xB0, 0x02, 0x1A, 0xCE  //this is the bootlace signature.
                    //it should also appear at near the end
                    //of pre_stage2
/* end characteristics distinguish this sector from others */
    /* DS:0000=_start1, ES=0x07E0 */
// If the signature not matches, it means only `stage1` has been loaded,
// `stage2` has not been loaded. Jump to load `stage2` from disk.
    jne 1f
// If the signature matches, it means `stage2` has been loaded following
// `stage1` and MBR backup. But they may not be in the desired location. Below
// will check the location and move them accordingly.

    /* move image to destination 0000:8200 */

// Compare `stage1`'s segment in BX with 0x07E0 (31.5KB).
    cmpw    $0x07E0, %bx
// If `stage1`'s segment in BX == 0x07E0, it means they are in the desired
// location.
    je  2f

// If `stage1`'s segment in BX > 0x07E0, jump to move down `stage1`.
    ja  3f
// If `stage1`'s segment in BX < 0x07E0, need to move up `stage2`.

    /* move up. Max pre_stage2 sectors=125. */

// Put 0xFFFC (?) to SI.
    movw    $0xFFFC, %si
// Put 0xFFFC to DI.
    movw    %si, %di
// Put 0x3F00 (15.75K) to CX, to be used as repeat times.
    movw    $0x3F00, %cx    /* move 0x7E=126 sectors. */
// Put 1 to DF. When DF is 1, string operations decrement SI and DI.
    std
// Copy 126 sectors (4B * 15.75K).
// Copy 4 bytes from [DS:SI] to [ES:DI], repeat 15.75K times.
// Each time SI and DI are decremented by 4, CX is decremented by 1.
    repz movsl
// Put 0 to DF. When DF is 0, string operations increment SI and DI.
    cld
// Jump to `stage2`.
    jmp 2f
3:
    /* move this sector down to 07C0:0000 */

    call    move_down_to_7C00

    /* CS=0x7C0. move pre_stage2 */

// Put 0x400 (1KB) to SI.
// Now DS:SI points to the start of the 3rd sector, i.e. `stage2`.
    movw    $0x400, %si /* point to pre_stage2 */
// Put 0x400 (1KB) to DI.
// Now ES:DI points to 07E0:0400, the desired location for `stage2`.
    movw    %si, %di    /* ES:DI=07E0:0400=0x8200 */
// Put 0x3F00 (15.75K) to CX, to be used as repeat times.
    movw    $0x3F00, %cx    /* move 0x7E=126 sectors. */
// Copy 126 sectors (4B * 15.75K).
// Copy 4 bytes from [DS:SI] to [ES:DI], repeat 15.75K times.
// Each time SI and DI are incremented by 4, CX is decremented by 1.
    repz movsl
// Jump to `stage2`.
    jmp 2f

move_down_to_7C00:

// Push ES.
    pushw   %es
// Push 0x07C0.
    pushw   $0x07C0
// Pop 0x07C0 to ES.
    popw    %es     /* ES=0x07C0 */

// Put 0 to SI.
    xorw    %si, %si
// Put 0 to DI.
    xorw    %di, %di
// Put 128 to CX, to be used as repeat times.
    movw    $0x80, %cx  /* move 1 sector */
// Put 0 to DF. When DF is 0, string operations increment SI and DI.
    cld
// Copy 4 bytes from [DS:SI] to [ES:DI], repeat 128 times.
// Each time SI and DI are incremented by 4, CX is decremented by 1.
    repz movsl

// Jump to `3f` in the 0x07C0 segment.
    ljmp    $0x07C0, $(3f - _start1)
3:
    //pushw %es     /* ES=0x07C0 */
    //popw  %bx     /* BX=0x07C0 */
// Pop old ES.
    popw    %es
// Return.
    ret

1:
    /* we are loaded by BIOS, only the MBR sector is loaded. */

    /* CS:0000=_start1, SS:SP=0000:0580 */
    /* DS:0000=_start1, ES=0x07E0 */
    /* CS=DS=BX */

    /* since only one sector is loaded, we assume segment=0x7C0. */

// Compare `stage1`'s segment in BX with 0x07C0.
    cmpw    $0x07C0, %bx
// If `stage1`'s segment in BX <= 0x07C0, it means no need to copy `stage1`
// down to segment 0x07C0. Jump to load `stage2` from disk.
    jbe 3f

    /* move this sector down to 07C0:0000 */
// If `stage1`'s segment in BX > 0x07C0, it means need to copy `stage1` down to
// segment 0x07C0. Call.
    call    move_down_to_7C00

    /* CS=0x7C0. */
3:

    /* setup a safe stack */

// Put 0x3E00 (15.5KB) to SP.
    movw    $0x3E00, %sp    /* SS:SP=0000:3E00 */
// Compare `stage1`'s segment in BX with 0x03E0 (992).
    cmpw    $0x03E0, %bx    /* BX=DS, BX=CS or BX > 0x7C0 */
// If `stage1`'s segment in BX >= 0x03E0, no need to relocate stack top. Jump
// to load `stage2` from disk.
// Segment 0x03E0 means address 0x3E00 (15.5KB).
    jnb 3f
// If `stage1`'s segment in BX < 0x03E0, need to relocate stack top, put 0x7C00
// (31KB) to SP.
    addw    %sp, %sp    /* SS:SP=0000:7C00 */
3:
// Put 1 to IF to enable maskable interrupts.
    sti /* now we have enough stack room. */

    /* clear the destination sector */
// Put 0 to AX.
    xorw    %ax, %ax
// Put 0 to DS.
    movw    %ax, %ds    /* let DS=0 to match SS=0 */
// Put 0 to DI.
    xorw    %di, %di
// Put 256 to CX, to be used as repeat times.
    movw    $0x100, %cx
// Put 0 to DF. When DF is 0, string operations increment SI and DI.
    cld
// Copy `stage1` to 0x07E0:0000 (63KB).
// Copy 2 bytes from [DS:SI] to [ES:DI], repeat 256 times.
// Each time SI and DI are incremented by 2, CX is decremented by 1.
    repz stosw

    /* read 127 sectors of drive 0x80 or drive 0x00 to 07E0:0000 */

// Put 0x80 to DL.
// (gdb) break *0x7CEE
    movb    $0x80, %dl  /* try hard drive first */
1:
// Put 0 to EAX.
// (gdb) break *0x7CF0
    xorl    %eax, %eax
// Push general-purpose registers.
    pushaw
// Code below uses the stack to hold an LBA packet.
//
// Specify higher 4 bytes of the sector number.
// Push 0.
    pushl   %eax
// Specify lower 4 bytes of the sector number.
// Push 0.
    pushl   %eax
// Specify the read buffer's segment.
// ES is 0x07E0 (31.5K).
    pushw   %es
// Specify the read buffer's offset.
// Push 0.
    pushw   %ax
// Specify the number of sectors to read.
// Push 127.
    pushw   $0x7f   //$63
// Specify the size of the LBA packet.
// Push 16.
    pushw   $0x10
// Point SI to the LBA packet on stack, as required by int13 AH=0x42 service.
    movw    %sp, %si    /* DS:SI=SS:SP=disk address packet */
// Specify to use int13 AH=0x42 service.
    movw    $0x4200, %ax
// Invoke interrupt 0x13 AH=0x42 service to read disk using LBA addressing.
// (gdb) break *0x7D03
    call    int13
// Pop off the LBA packet.
// (gdb) break *0x7D06
    popaw
// Pop old general-purpose registers.
    popaw

    /* compare the sector to the MBR, ignoring BPB */

// Put 0x5A (90) to SI.
    movw    $0x5A, %si
// Put 0x5A (90) to DI.
    movw    %si, %di
// Put to CX the times required to compare from byte 0x5A (90) to byte 0x1FF
// (511), i.e. comparing one sector ignoring the first 90 bytes.
// (gdb) break *0x7D0D
    movw    $((0x200 - 0x5A) / 2), %cx
// Compare this sector with the first sector read, ignoring the first 90 bytes.
// (gdb) break *0x7D10
    cs repz cmpsw
// If equal, jump.
    je  1f
// Test whether DL is 0, which means the first floppy disk.
    testb   %dl, %dl    /* floppy tried? */
// If DL is 0, jump.
    je  Error_or_prev_MBR   /* yes. fail */
// If DL is not 0, put 0 to DL.
    movb    $0, %dl     /* then try floppy */
// Jump to re-try with the floppy disk.
    jmp 1b
1:
// Put ES to BX.
// (gdb) break *0x7D1D
    movw    %es, %bx
// Add `stage2`'s end segment to BX.
    addw    $((wee63_signature - _start1 + 4 + STAGE2_SIZE - 4) >> 4), %bx
// Put `stage2`'s end segment in BX to DS.
    movw    %bx, %ds

// Check `stage2`'s signature bytes.
// Notice the second operand is `DS:_STAGE2_SIGNATURE_OFFSET_`.
    cmpl    $0xCE1A02B0, ((STAGE2_SIZE - 4) & 0x0F)
// If the signature not matches, jump.
    jne Error_or_prev_MBR   /* Missing helper */
// If the signature matches.
2:
// Jump to `stage2` (0x8200 = 32.5KB).
// (gdb) break *0x7D30
    ljmp    $0, $0x8200

Error_or_prev_MBR:

    /* wee63 not found, launch previous MBR or print error message. */

// Put CS to AX.
// (gdb) break *0x7D35
    movw    %cs, %ax
// Put CS to DS.
    movw    %ax, %ds
// Put CS to ES.
    movw    %ax, %es
// Put CS to SS.
    movw    %ax, %ss
// Put 0xF000 (60KB) to SP.
    movw    $0xF000, %sp

// Put 0x80 to DL.
    movb    $0x80, %dl  /* hard drive */
// Put 0 to EAX.
    xorl    %eax, %eax
// Put 0 to [0x05FE] (byte 510 and 511 relative to the read buffer 0x400
// below).
    movw    %ax, 0x5FE  /* clear boot signature */
// Push general-purpose registers.
    pushaw
// Code below uses the stack to hold an LBA packet.
//
// Specify the sector number.
// Specify higher 4 bytes of sector number.
// Push 0.
    pushl   %eax
// Put 1 to AX.
    incw    %ax     /* EAX=1 for prev_MBR */
// Specify lower 4 bytes of sector number.
// Push 1.
    pushl   %eax
// Specify the read buffer's segment.
    pushw   %es
// Specify the read buffer's offset.
    pushw   $0x400
// Specify the number of sectors to read.
// Push 1.
    pushw   %ax     /* read 1 sector */
// Specify the size of the LBA packet.
// Push 16.
    pushw   $0x10
// Point SI to the LBA packet on stack, as required by int13 AH=0x42 service.
    movw    %sp, %si
// Specify to use int13 AH=0x42 service.
    movw    $0x4200, %ax
// Invoke interrupt 0x13 AH=0x42 service to read disk using LBA addressing.
    call    int13
// Pop off the LBA packet.
    popaw
// Pop old general-purpose registers.
    popaw

// Compare [0x5FE] (byte 510 and byte 511 relative to the read buffer 0x400)
// with 0xAA55 which means bootable flag.
    cmpw    $0xAA55, 0x5FE
// If [0x5FE] not matches the bootable flag, jump to print error message.
    jne 1f
// If [0x5FE] matches the bootable flag, boot from the backup MBR.

    /* boot prev_MBR */

    /* move this sector up */

// Put 0 to SI.
    xorw    %si, %si
// Put 0x200 to SI.
// Now SI points to the sector after `stage1`.
    movw    $0x200, %di
// Put 256 to CX, to be used as repeat times.
    movw    $0x100, %cx
// Put 0 to DF. When DF is 0, string operations increment SI and DI.
    cld
// Copy 1 sector (2B * 256).
// Copy 2 bytes from [DS:SI] to [ES:DI], repeat 256 times.
// Each time SI and DI are decremented by 2, CX is decremented by 1.
    repz movsw

// Jump to `f2` in the 0x07E0 segment.
    ljmp    $0x07E0, $(2f - _start1)
2:
    /* move prev_MBR to 0000:7C00 */

// Put 0 to DI.
// Now ES:DI points to 07C0:0000.
    xorw    %di, %di
// Put 0x400 to SI.
// Now DS:SI points to the read buffer holding the backup MBR.
    movw    $0x400, %si
// Put 256 to CX, to be used as repeat times.
    movw    $0x100, %cx
// Put 0 to DF. When DF is 0, string operations increment SI and DI.
    cld
// Copy 1 sector (2B * 256).
// Copy 2 bytes from [DS:SI] to [ES:DI], repeat 256 times.
// Each time SI and DI are decremented by 2, CX is decremented by 1.
    repz movsw

// Jump to the backup MBR.
    ljmp    $0x0, $0x7C00   /* boot! */

1:
// Put the error message's offset to SI.
    movw    $(message_string - _start1), %si

// Print the error message.
    call    print_message   /* CS:SI points to message string */

// Jump to re-try.
3:  jmp 3b

int13:
    pushw   %ds
    pushw   %es
//  pushw   %bx
    pushw   %dx
    pushw   %si
    pushw   %di
    pushw   %bp
// Put 1 to CF.
    stc
// Invoke interrupt 0x13 service to read disk.
    int $0x13
    popw    %bp
    popw    %di
    popw    %si
    popw    %dx
//  popw    %bx
    popw    %es
    popw    %ds
    ret

    /* prints string CS:SI (modifies AX BX SI) */
3:
    //xorw  %bx, %bx    /* video page 0 */
// Put 0x0E to AH.
// 0x0E means TTY mode for interrupt 0x10 video service.
    movb    $0x0e, %ah  /* print char in AL */
// Invoke interrupt 0x10 video service to print the character in AL.
    int $0x10       /* via TTY mode */

print_message:

// Put the character in [DS:SI] to AL.
// SI is incremented.
// Now SI points to one byte after the character.
// If the character is value 0, it will be the last character to print, then SI
// points to the next instruction to return to.
    lodsb   %cs:(%si), %al  /* get token */
// Compare the character in AL with 0.
    cmpb    $0, %al     /* end of string? */
// If the character is not 0, jump to print the next character.
    jne 3b
// If the character is 0, return.
    ret

message_string:

// Error message.
    .ascii  "\r\nUrr! wee...\0"

    /* Make sure the above code does not occupy the partition table */

    /* offset value here must be less than or equal to 0x1b8 */
    . = . - ((. - _start1) / 0x1b9)

// Byte 446.
    . = _start1 + 0x1be /* The partition table */

// Byte 510.
    . = _start1 + 0x1fe /* boot signature */

    .word   0xaa55

    . = _start1 + 0x200

/* if it is in the Master Boot Track, the second sector can be used to backup
 * the previously working MBR, typically, the MS MBR. if the backup copy of
 * the MBR cannot boot(because, e.g., it depends on another sector of code
 * that does not exist for now), then please do not set the ending signature
 * to 0xAA55, that is to say, if the signature is already 0xAA55, you should
 * change it to another value(for example, 0x0000).
 */

    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90

    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90

    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90

    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90

    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90

    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90

    . = _start1 + 0x256 /* cmdcons comes here */

    .byte   0x90, 0x90

    . = _start1 + 0x258

    .byte   0x90, 0x90

    . = _start1 + 0x25a

    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90
    .byte   0x90, 0x90

    . = _start1 + 0x26a
1:
    cli
    xorw    %bx, %bx
    movw    %bx, %ss
    movw    $0x600, %sp     /* temp safe stack space */
    call    1f
1:
    popw    %bx         /* Instruction Pointer of 1b */
    subw    $(1b - _start1), %bx    /* CS:BX=_start1 */

    shrw    $4, %bx
    movw    %cs, %ax
    addw    %ax, %bx        /* BX:0000=_start1 */

    /* we are booted by BIOS, or whole image already loaded */

    /* Let CS:0000=_start1 */
    pushw   %bx         /* BX:0000=_start1 */

    pushw   $(1f - _start1)
    #;.byte 0x6A, (1f - _start1)

    lret
    //. = . - (. - _start1) / 0x80
1:
    movw    %bx, %ds

    /* print a message for BOOT.INI */
    movw    $(BOOT_INI_string - _start1), %si

    call    print_message   /* CS:SI points to message string */

    /* a value < 0x80 here means we are not booted from no-emulation-mode
     * bootable CD.
     */
    movb    $0x7F, %dl
    jmp _start1

BOOT_INI_string:

    .ascii  "\r\nShould not run from BOOT.INI\r\n\0"

#if 0
wee63_real_start:

    cli
    movw    %cs, %bp    /* save CS to BP */
    call    1f
1:
    popw    %bx     /* BX=Instruction Pointer of 1b */
    subw    $(1b - _start1), %bx
    movw    %bx, %cx
    shrw    $4, %bx
    addw    %bp, %bx
    pushw   %bx     /* new CS */
    andw    $0x000f, %cx
    addw    $(1f - _start1), %cx
    pushw   %cx     /* new IP */
    lret
1:
    movw    %ds, %cx    /* CX==BP==0x7C0 for pxe enabled */
    pushw   %cs
    popw    %ds

    /* CS=DS=BX, CS:0000 = _start1 */

    addw    $((pre_stage2_start - _start1) >> 4), %bx

    /* BX:0000 = pre_stage2_start */

    cmpw    $0x7C0, %bp
    jne 1f
    cmpw    %bp, %cx
    je  2f
1:
    /* disable pxe */
    orb $0x01, (pre_stage2_start - _start1 + 5)
2:
    cmpw    $0x820, %bx
    jb  2f

    movw    $((0x8200 - (pre_stage2_start - _start1) - 0x400) >> 4), %cx

    /* Now CS(=DS) >= CX+0x40 */

    movw    %cx, %es
    xorw    %di, %di
    xorw    %si, %si

    /////////////////////////////////////////////////////////////
    //
    //                    CS
    //                    DS          0x820     BX
    //                    _start1---------------pre_stage2_start
    //          CX+0x40---------------0x820
    //   CX
    //   ES
    //
    /////////////////////////////////////////////////////////////

    movw    $0x200, %cx /* move 2 sectors */
    cld
    repz movsw

    pushw   %es     /* ES:0000 = _start */
    pushw   $(1f - _start)
    lret            /* CS=ES, CS:0000 = _start1 */
1:

    /* move BX:0000 to 0820:0000 upward since BX >= 0x820 */

    cld

    movw    %bx, %ds
    movw    $0x820, %bx
    movw    %bx, %es

    xorw    %si, %si
    xorw    %di, %di

    movw    $6, %bx     /* 64K pages: 0x20000 - 0x7ffff */
1:
    movw    $0x8000, %cx
    repz movsw
    movw    %ds, %ax
    addw    $0x1000, %ax
    movw    %ax, %ds
    movw    %es, %ax
    addw    $0x1000, %ax
    movw    %ax, %es
    decw    %bx
    jnz 1b

    jmp 3f
2:

    /* move BX:0000 to 0820:0000 downward since BX < 0x820 */

    std

    addw    $0x7000, %bx
    movw    %bx, %ds
    movw    $0x7820, %bx
    movw    %bx, %es

    movw    $0xfffe, %si
    movw    %si, %di

    movw    $8, %bx     /* 64K pages: 0x08200 - 0x881ff */
1:
    movw    $0x8000, %cx
    repz movsw
    movw    %ds, %ax
    subw    $0x1000, %ax
    movw    %ax, %ds
    movw    %es, %ax
    subw    $0x1000, %ax
    movw    %ax, %es
    decw    %bx
    jnz 1b

    cld

3:

    xorw    %ax, %ax
    movw    %ax, %es
    movw    %ax, %ds
    movw    %ax, %ss
    movw    $0x2000, %sp

    movw    $0x0003, %ax    /* set display mode: 80*25 color text */
    int $0x10
    ljmp    $0, $0x8200
#endif

    . = _start1 + 0x3FC

wee63_signature:
    //.byte 0x47, 0x52, 0x55, 0xaa  /* signature for helper */

    // 0x400 = 1024 means 2 sectors, i.e. `stage1` and MBR backup.
    . = _start1 + 0x400

pre_stage2_start:

```
