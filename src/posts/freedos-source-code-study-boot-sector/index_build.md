--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: FreeDOS source code study - boot sector

author: Aoik

create_time: 2019-08-04 20:00:00

tags:
    - freedos-source-code-study
    - operating-system-study
    - boot-sector
    - 吸星大法强吃源码

post_id: 34

$template:
    file: root://src/posts/_base/post_page_base_no_highlight.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# FreeDOS source code study - boot sector

## boot.asm
[boot/boot.asm](https://github.com/FDOS/kernel/blob/9d5abfe25aeff1bdbe325d49bc2dcae493a351bb/boot/boot.asm).
```
;
; File:
;                            boot.asm
; Description:
;                           DOS-C boot
;
;                       Copyright (c) 1997;
;                           Svante Frey
;                       All Rights Reserved
;
; This file is part of DOS-C.
;
; DOS-C is free software; you can redistribute it and/or
; modify it under the terms of the GNU General Public License
; as published by the Free Software Foundation; either version
; 2, or (at your option) any later version.
;
; DOS-C is distributed in the hope that it will be useful, but
; WITHOUT ANY WARRANTY; without even the implied warranty of
; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See
; the GNU General Public License for more details.
;
; You should have received a copy of the GNU General Public
; License along with DOS-C; see the file COPYING.  If not,
; write to the Free Software Foundation, 675 Mass Ave,
; Cambridge, MA 02139, USA.
;
;
;       +--------+ 1FE0:7E00
;       |BOOT SEC|
;       |RELOCATE|
;       |--------| 1FE0:7C00
;       |LBA PKT |
;       |--------| 1FE0:7BC0
;       |--------| 1FE0:7BA0
;       |BS STACK|
;       |--------|
;       |4KBRDBUF| used to avoid crossing 64KB DMA boundary
;       |--------| 1FE0:63A0
;       |        |
;       |--------| 1FE0:3000
;       | CLUSTER|
;       |  LIST  |
;       |--------| 1FE0:2000
;       |        |
;       |--------| 0000:7E00
;       |BOOT SEC| overwritten by max 128k FAT buffer
;       |ORIGIN  | and later by max 134k loaded kernel
;       |--------| 0000:7C00
;       |        |
;       |--------|
;       |KERNEL  | also used as max 128k FAT buffer
;       |LOADED  | before kernel loading starts
;       |--------| 0060:0000
;       |        |
;       +--------+


;%define ISFAT12         1
;%define ISFAT16         1


; Set segment type.
segment .text

%define BASE            0x7c00

; Let offset base be 0x7C00.
                org     BASE

; The boot sector's entry point.
; (gdb) break *0x7C00
; Jump to `real_start`.
Entry:          jmp     short real_start
; NOP instruction for the third byte, as required by FAT specification.
                nop

; The `jmp` and `nop` above take 3 bytes, followed by FAT info variables.
; These variables are initialized when running `SYS.COM` to install the boot
; sector.
;
; The offsets of the FAT info variables:
;       bp is initialized to 7c00h
%define bsOemName       bp+0x03      ; OEM label
%define bsBytesPerSec   bp+0x0b      ; bytes/sector
%define bsSecPerClust   bp+0x0d      ; sectors/allocation unit
%define bsResSectors    bp+0x0e      ; # reserved sectors
%define bsFATs          bp+0x10      ; # of fats
%define bsRootDirEnts   bp+0x11      ; # of root dir entries
%define bsSectors       bp+0x13      ; # sectors total in image
%define bsMedia         bp+0x15      ; media descrip: fd=2side9sec, etc...
%define sectPerFat      bp+0x16      ; # sectors in a fat
%define sectPerTrack    bp+0x18      ; # sectors/track
%define nHeads          bp+0x1a      ; # heads
%define nHidden         bp+0x1c      ; # hidden sectors
%define nSectorHuge     bp+0x20      ; # sectors if > 65536
%define drive           bp+0x24      ; drive number
%define extBoot         bp+0x26      ; extended boot signature
%define volid           bp+0x27
%define vollabel        bp+0x2b
%define filesys         bp+0x36

; Example of the first 62 bytes of the boot sector:
; 00: EB 3C 90 | 00 00 00 00 00 00 00 00 | 00 02 (512) | 01 | 01 00 |
; 10: 02 | E0 00 (224) | 40 0B (2880) | F0 | 09 00 | 12 00 | 02 00 | 00 00 00 00 |
; 20: 00 00 00 00 | 00 00 | 29 | 00 00 00 00 | 20 20 20 20 20
; 30: 20 20 20 20 20 20 | 46 41 54 31 32 20 20 20
;
; # bsOemName times 8 db 0
; (gdb) x/8xb 0x7C03 = x/8xb 0x27A03 = 0x0000000000000000
; # bsBytesPerSec dw 0
; (gdb) x/1dh 0x7C0B = x/1dh 0x27A0B = 512
; # bsSecPerClust db 0
; (gdb) x/1db 0x7C0D = x/1db 0x27A0D = 1
; # bsResSectors dw 0
; (gdb) x/1dh 0x7C0E = x/1dh 0x27A0E = 1
; # bsFATs db 0
; (gdb) x/1db 0x7C10 = x/1db 0x27A10 = 2
; # bsRootDirEnts dw 0
; (gdb) x/1dh 0x7C11 = x/1dh 0x27A11 = 224
; # bsSectors dw 0
; (gdb) x/1dh 0x7C13 = x/1dh 0x27A13 = 2880 for 1440KB.
; # bsMedia db 0
; (gdb) x/1xb 0x7C15 = x/1xb 0x27A15 = F0 for 3.5-inch 1440 KB or 2880 KB FD.
; # sectPerFat dw 0
; (gdb) x/1dh 0x7C16 = x/1dh 0x27A16 = 9
; # sectPerTrack dw 0
; (gdb) x/1dh 0x7C18 = x/1dh 0x27A18 = 18 for 1440 KB FD, 36 for 2880 KB FD.
; # nHeads dw 0
; (gdb) x/1dh 0x7C1A = x/1dh 0x27A1A = 2
; # nHidden dd 0
; (gdb) x/1dw 0x7C1C = x/1dw 0x27A1C = 0
; # nSectorHuge dd 0
; (gdb) x/1dw 0x7C20 = x/1dw 0x27A20 = 0
; # drive dw 0
; (gdb) x/1dh 0x7C24 = x/1dh 0x27A24 = 0
; # extBoot db 0
; (gdb) x/1xb 0x7C26 = x/1xb 0x27A26 = 0x29: The following three fields are present.
; # volid dd 0
; (gdb) x/1xw 0x7C27 = x/1xw 0x27A27 = 0x00000000
; # vollabel times 11 db 0
; (gdb) x/11xb 0x7C2B = x/11xb 0x27A2B = 0x2020202020202020202020
; # filesys times 8 db 0
; (gdb) x/8xb 0x7C36 = x/8xb 0x27A36 = 0x4641543132202020 (FAT12)
; Ends at 0x7C3E or 0x27A3E, exclusive.

; The user read buffer's segment.
; The starting address is 0x0060:0x0000 = 1.5KB.
; The user read buffer will store the kernel in the end.
; The reason to choose the starting address 1.5KB is because the first 1.5KB
; of the memory stores BIOS' interrupt vector table and other data thus should
; not be overwritten.
%define LOADSEG         0x0060

; The FAT buffer's offset.
; The FAT buffer stores the kernel file's cluster numbers.
; The starting address is 0x1FE0:0x2000 = 135.5KB.
%define FATBUF          0x2000          ; offset of temporary buffer for FAT
                                        ; chain

;       Some extra variables

;%define StoreSI         bp+3h          ;temp store

;-----------------------------------------------------------------------

; Allocate 59 bytes of zeros from $$+3 (0x7C03) up to $$+0x3E (0x7C3E)
; exclusive.
; `$` is `$$+3` because the `jmp` and `nop` instructions above take 3 bytes.
                times   0x3E-$+$$ db 0

; The offset of the variable storing the user read buffer's offset.
;
; using bp-Entry+loadseg_xxx generates smaller code than using just
; loadseg_xxx, where bp is initialized to Entry, so bp-Entry equals 0
%define loadsegoff_60   bp-Entry+loadseg_off
; The offset of the variable storing the user read buffer's segment.
%define loadseg_60      bp-Entry+loadseg_seg

; The offset of the LBA packet used by interrupt 0x13.
; 64B before 0x7C00.
%define LBA_PACKET       bp-0x40
; The offset of the field that stores the LBA packet's size.
%define LBA_SIZE       word [LBA_PACKET]    ; size of packet, should be 10h
; The offset of the field that stores the number of sectors to read.
%define LBA_SECNUM     word [LBA_PACKET+2]  ; number of sectors to read
; The offset of the field that stores the read buffer's offset.
%define LBA_OFF        LBA_PACKET+4         ; buffer to read/write to
; The offset of the field that stores the read buffer's segment.
%define LBA_SEG        LBA_PACKET+6
; The offset of the field that stores the 48-bit LBA sector number.
%define LBA_SECTOR_0   word [LBA_PACKET+8 ] ; LBA starting sector #
%define LBA_SECTOR_16  word [LBA_PACKET+10]
%define LBA_SECTOR_32  word [LBA_PACKET+12]
%define LBA_SECTOR_48  word [LBA_PACKET+14]

; `readDisk`'s read buffer's offset.
; The segment is 0x1FE0.
; 0x1FE0:0x63A0 = 0x261A0 = 152.40625KB, 6240B before 0x1FE0:0x7C00 (158.5KB).
%define READBUF 0x63A0 ; max 4KB buffer (min 2KB stack), == stacktop-0x1800
; The offset of the variable storing `readDisk`'s destination buffer's unfilled
; part's segment.
; 6244B before 0x7C00.
%define READADDR_OFF   BP-0x60-0x1804    ; pointer within user read buffer
; The offset of the variable storing `readDisk`'s destination buffer's unfilled
; part's offset.
; 6242B before 0x7C00.
%define READADDR_SEG   BP-0x60-0x1802

; The offset of the space after the LBA packet.
%define PARAMS LBA_PACKET+0x10
;%define RootDirSecs     PARAMS+0x0         ; # of sectors root dir uses

; The offset of the variable storing the first FAT's sector number.
%define fat_start       PARAMS+0x2         ; first FAT sector

; The offset of the variable storing the FAT root directory's sector number.
%define root_dir_start  PARAMS+0x6         ; first root directory sector

; The offset of the variable storing the FAT data region's sector number.
%define data_start      PARAMS+0x0a        ; first data sector


;-----------------------------------------------------------------------
;   ENTRY
;-----------------------------------------------------------------------

real_start:
; Code below aims to copy the boot sector from 0x0000:0x7C00 (0x7C00 = 31KB) to
; 0x1FE0:0x7C00 (0x27A00 = 158.5KB) because the region containing 0x7C00 will
; be used to store kernel instead.

; (gdb) break *0x7C3E
; Put 0 to IF to disable maskable interrupts.
                cli
; Put 0 to DF. When DF is 0, string operations increment SI and DI.
                cld
; Put 0 to AX.
; `xor ax, ax` generates 2 bytes machine code compared to `mov ax, 0` 3 bytes.
                xor     ax, ax
; Put 0 to DS.
                mov     ds, ax
; Put 0x7C00 to BP.
                mov     bp, BASE


                                        ; a reset should not be needed here
;               int     0x13            ; reset drive

;               int     0x12            ; get memory available in AX
;               mov     ax, 0x01e0
;               mov     cl, 6           ; move boot sector to higher memory
;               shl     ax, cl
;               sub     ax, 0x07e0

; Put 0x1FE0 to AX.
                mov     ax, 0x1FE0
; Put 0x1FE0 to ES.
                mov     es, ax
; Put 0x7C00 to SI.
                mov     si, bp
; Put 0x7C00 to DI.
                mov     di, bp
; Put 256 to CX, to be used as repeat times below.
                mov     cx, 0x0100
; Copy 2 bytes from [DS:SI] to [ES:DI], repeat 256 times.
; Each time SI and DI are incremented by 2, CX is decremented by 1.
                rep     movsw
; Jump to `cont` in the 0x1FE0 segment.
                jmp     word 0x1FE0:cont

; Variable storing the user read buffer's offset.
loadseg_off     dw      0
; Variable storing the user read buffer's segment.
loadseg_seg     dw      LOADSEG

cont:
; Code below aims read the FAT root directory's entries to the user read
; buffer.

; (gdb) break *0x27A5E
; Put 0x1FE0 to DS.
                mov     ds, ax
; Put 0x1FE0 to SS.
                mov     ss, ax
; Put 0x7BA0 (96B before 0x1FE0:0x7C00) to SP.
                lea     sp, [bp-0x60]
; Put 1 to IF to enable maskable interrupts.
                sti
;
; Note: some BIOS implementations may not correctly pass drive number
; in DL, however we work around this in SYS.COM by NOP'ing out the use of DL
; (formerly we checked for [drive]==0xff; update sys.c if code moves)
;
; Put the drive number in DL to [drive].
; DL was set by BIOS before loading the boot sector.
; DL = 00h: 1st floppy disk.
; DL = 01h: 2nd floppy disk.
; DL = 80h: 1st hard disk.
; DL = 81h: 2nd hard disk.
; DL = e0h: 1st CD.
                mov     [drive], dl     ; rely on BIOS drive number in DL

; Put 16 to the `LBA_SIZE` field.
                mov     LBA_SIZE, 10h
; Put the number of sectors to read to the `LBA_SECNUM` field.
                mov     LBA_SECNUM,1    ; initialise LBA packet constants
; Put `readDisk`'s read buffer's segment to the `LBA_SEG` field.
                mov     word [LBA_SEG],ds
; Put `readDisk`'s read buffer's offset to the `LBA_OFF` field.
                mov     word [LBA_OFF],READBUF


;       GETDRIVEPARMS:  Calculate start of some disk areas.
;
; Put lower 2 bytes of the number of hidden sectors to SI.
; E.g. SI = 0.
                mov     si, word [nHidden]
; Put higher 2 bytes of the number of hidden sectors to DI.
; E.g. DI = 0.
; Now DI:SI stores the number of hidden sectors.
                mov     di, word [nHidden+2]
; Add the number of reserved sectors to SI.
; If overflow, CF becomes 1.
; E.g. SI = 1.
                add     si, word [bsResSectors]
; Add CF to DI.
; Now DI:SI stores the number of hidden and reserved sectors, which is also the
; first FAT's sector number.
; E.g. DI = 0.
                adc     di, byte 0              ; DI:SI = first FAT sector

; Put lower 2 bytes of the first FAT's sector number to `[fat_start]`.
                mov     word [fat_start], si
; Put higher 2 bytes of the first FAT's sector number to `[fat_start+2]`.
                mov     word [fat_start+2], di

; Put the number of FATs to AL.
; E.g. AL = 2.
                mov     al, [bsFATs]
; Extend AL to AX.
; Now AX stores the number of FATs.
; E.g. AX = 2.
                cbw
; Multiply the number of FATs by the number of sectors per FAT.
; DX:AX = AX * [sectPerFat].
; Now DX:AX stores the number of FAT sectors.
; E.g. DX = 0. AX = 18.
                mul     word [sectPerFat]       ; DX:AX = total number of FAT sectors

; Add the number of FAT sectors to the number of hidden and reserved sectors.
; Now DI:SI stores the FAT root directory's sector number.
; E.g. SI = 19. DI = 0.
                add     si, ax
                adc     di, dx                  ; DI:SI = first root directory sector
; Put lower 2 bytes of the FAT root directory's sector number to
; `[root_dir_start]`.
                mov     word [root_dir_start], si
; Put higher 2 bytes of the FAT root directory's sector number to
; `[root_dir_start+2]`.
                mov     word [root_dir_start+2], di

                ; Calculate how many sectors the root directory occupies.
; Put the number of bytes per sector to BX.
; E.g. BX = 512.
                mov     bx, [bsBytesPerSec]
; Put 5 in CL, to be used as shfit count below.
                mov     cl, 5                   ; divide BX by 32
; Divide the number of bytes per sector by the number of bytes per directory
; entry.
; Now BX stores the number of directory entries per sector.
; E.g. BX = BX / 2^5 = BX / 32 = 512 / 32 = 16.
                shr     bx, cl                  ; BX = directory entries per sector

; Put the number of directory entries of the FAT root directory to AX.
; E.g. AX = 224.
                mov     ax, [bsRootDirEnts]
; Put 0 to DX.
                xor     dx, dx
; Divide the number of directory entries of the FAT root directory by the
; number of directory entries per sector.
; DX(remainder):AX(quotient) = DX:AX / BX.
; Now AX stores the number of sectors of the FAT root directory.
; E.g. DX:AX = DX:AX / BX = 224 / 16 = 0:14.
                div     bx

;               mov     word [RootDirSecs], ax  ; AX = sectors per root directory
; Push the number of sectors of the FAT root directory in AX.
                push    ax

; Add the number of sectors of the FAT root directory to the FAT root
; directory's sector number.
; If overflow, CF becomes 1.
; E.g. SI = SI + AX = 19 + 14 = 33.
                add     si, ax
; Add CF to DI.
; Now DI:SI stores the FAT data region's sector number.
; E.g. DI = 0.
                adc     di, byte 0              ; DI:SI = first data sector

; Put lower 2 bytes of the FAT data region's sector number to `[data_start]`.
                mov     [data_start], si
; Put higher 2 bytes of the FAT data region's sector number to
; `[data_start+2]`.
                mov     [data_start+2], di


;       FINDFILE: Searches for the file in the root directory.
;
;       Returns:
;                               AX = first cluster of file

                ; First, read the whole root directory
                ; into the temporary buffer.

; Put lower 2 bytes of the FAT root directory's sector number to AX.
                mov     ax, word [root_dir_start]
; Put higher 2 bytes of the FAT root directory's sector number to DX.
; DX:AX specifies the starting sector number for `readDisk` below.
                mov     dx, word [root_dir_start+2]
; Pop the number of sectors of the FAT root directory to DI.
; DI specifies the number of sectors to read for `readDisk` below.
; E.g. DI = 14.
                pop     di                      ; mov     di, word [RootDirSecs]
; Point ES:BX to the user read buffer.
; ES:BX specifies the destination buffer for `readDisk` below.
; (gdb) break *0x27ABF
                les     bx, [loadsegoff_60] ; es:bx = 60:0
; Read the FAT root directory's sectors to the user read buffer.
                call    readDisk

; Code below aims to find the directory entry of the kernel file.
;
; Point ES:DI to the user read buffer.
; (gdb) break *0x27AC5
                les     di, [loadsegoff_60] ; es:di = 60:0


                ; Search for KERNEL.SYS file name, and find start cluster.

; Put 11 to CX, to be used as repeat times below.
; 11 means 8+3 style file name.
next_entry:     mov     cx, 11
; Point SI to the kernel file name.
                mov     si, filename
; Push the user read buffer's offset in DI.
                push    di
; Compare byte [DS:SI] with byte [ES:DI], repeat at most 11 times.
; Each time SI and DI are incremented by 1.
; If all 11 characters are equal, ZF becomes 1.
                repe    cmpsb
; Pop the user read buffer's offset to DI.
; Now ES:DI points to the user read buffer.
                pop     di
; Put the directory entry's first cluster number to AX.
; A directory entry's byte 0x1A stores its first cluster number.
                mov     ax, [es:di+0x1A]; get cluster number from directory entry
; If the kernel file name is found, jump to `ffDone`.
                je      ffDone

; Increment DI by 32 to point to the next directory entry.
                add     di, byte 0x20   ; go to next directory entry
; Test whether the first byte of the file name is 0, which means end-of-entry.
                cmp     byte [es:di], 0 ; if the first byte of the name is 0,
; If it is not end-of-entry, jump to `next_entry`.
                jnz     next_entry      ; there is no more files in the directory

; If it is end-of-entry, jump to `boot_error`.
                jc      boot_error      ; fail if not found
ffDone:
; Push the kernel file's first cluster number in AX.
; (gdb) break *0x27AE3
                push    ax              ; store first cluster number


;       GETFATCHAIN:
;
;       Reads the FAT chain and stores it in a temporary buffer in the first
;       64 kb.  The FAT chain is stored an array of 16-bit cluster numbers,
;       ending with 0.
;
;       The file must fit in conventional memory, so it can't be larger than
;       640 kb. The sector size must be at least 512 bytes, so the FAT chain
;       can't be larger than 2.5 KB (655360 / 512 * 2 = 2560).
;
;       Call with:      AX = first cluster in chain

; Code below aims to load the first FAT to the user read buffer.
;
; Point ES:BX to the user read buffer.
; ES:BX specifies the destination buffer for `readDisk` below.
                les     bx, [loadsegoff_60]     ; es:bx=60:0
; Put the number of sectors per FAT to DI.
; DI specifies the number of sectors to read for `readDisk` below.
                mov     di, [sectPerFat]
; Put lower 2 bytes of the first FAT's sector number to AX.
                mov     ax, word [fat_start]
; Put higer 2 bytes of the first FAT's sector number to DX.
; DX:AX specifies the starting sector number for `readDisk` below.
                mov     dx, word [fat_start+2]
; Read the first FAT's sectors to the user read buffer.
                call    readDisk
; Pop the kernel file's first cluster number to AX.
; (gdb) break *0x27AF3
                pop     ax                      ; restore first cluster number

; Code below aims to put all the cluster numbers of the kernel file to the FAT
; buffer and put a 0 in the end.
                ; Set ES:DI to the temporary storage for the FAT chain.
; Put DS to ES.
; ES = 0x1FE0.
                push    ds
                pop     es
; Put the user read buffer's segment to DS.
; DS = 0x0060.
; SI will be set below to point to each cluster number of the kernel file.
                mov     ds, [loadseg_60]
; Put the FAT buffer's offset to DI.
; DI = 0x2000.
; Now ES:DI points to the FAT buffer.
                mov     di, FATBUF

; Put the current cluster number in AX to [ES:DI] in the FAT buffer.
next_clust:     stosw                           ; store cluster number
; Code below aims to get the next cluster number.
;
; Put the current cluster number in AX to SI.
                mov     si, ax                  ; SI = cluster number

%ifdef ISFAT12
                ; This is a FAT-12 disk.

; Each 12-bit cluster number is stored across 2 bytes.
; The bits layout of 2 consective cluster numbers (12 bits * 2 = 24 bits) in 3
; bytes is:
; 0 76543210
; 1 3210BA98
; 2 BA987654

; Multiply the current cluster number by 3.
fat_12:         add     si, si          ; multiply cluster number by 3...
                add     si, ax
; Divide the current cluster number by 2 to get the offset of the 2 bytes
; storing the next cluster number.
; If the current cluster number is odd, CF becomes 1.
                shr     si, 1           ; ...and divide by 2
; Put the 2 bytes storing the next cluster number in [DS:SI] to AX.
                lodsw

                ; If the cluster number was even, the cluster value is now in
                ; bits 0-11 of AX. If the cluster number was odd, the cluster
                ; value is in bits 4-15, and must be shifted right 4 bits. If
                ; the number was odd, CF was set in the last shift instruction.

; If CF is 0 which means the current cluster number is even, jump to
; `fat_even`.
                jnc     fat_even
; If CF is 1 which means the current cluster number is odd.
; Put 4 in CL, to be used as shift count below.
                mov     cl, 4
; Shift off the lower 4 bits.
                shr     ax, cl

; Mask off the higher 4 bits.
; Now AX stores the new current cluster number.
fat_even:       and     ah, 0x0f        ; mask off the highest 4 bits
; Test whether the new current cluster number is EOF.
                cmp     ax, 0x0ff8      ; check for EOF
; If the new current cluster number is not EOF, jump to `next_clust`.
                jb      next_clust      ; continue if not EOF

%endif
%ifdef ISFAT16
                ; This is a FAT-16 disk. The maximal size of a 16-bit FAT
                ; is 128 kb, so it may not fit within a single 64 kb segment.

; Put the user read buffer's segment to DX.
; DX = 0x0060.
fat_16:         mov     dx, [loadseg_60]
; Multiply the current cluster number by 2 to get the offset of the 2 bytes
; storing the next cluster number.
; If overflow, CF becomes 1.
                add     si, si          ; multiply cluster number by two
; If not overflow, jump to `first_half`.
                jnc     first_half      ; if overflow...
; If overflow, add 0x1000 to DX, which points DX to the next 0x10000 bytes
; segment. Notice SI overflows around and SI can address 0x10000 bytes (64KB).
                add     dh, 0x10        ; ...add 64 kb to segment value

; Put the user read buffer's segment to DS.
; Now DS:SI points to the next cluster number.
first_half:     mov     ds, dx          ; DS:SI = pointer to next cluster
; Put the next cluster number in [DS:SI] to AX.
; Now AX stores the new current cluster number.
                lodsw                   ; AX = next cluster

; Test whether the new current cluster number is EOF.
                cmp     ax, 0xfff8      ; >= FFF8 = 16-bit EOF
; If the new current cluster number is not EOF, jump to `next_clust`.
                jb      next_clust      ; continue if not EOF
%endif

finished:       ; Mark end of FAT chain with 0, so we have a single
                ; EOF marker for both FAT-12 and FAT-16 systems.

; Put 0 to AX.
                xor     ax, ax
; Put 0 in AX to [ES:DI] in the FAT buffer to mark the end.
                stosw

; Code below aims to load the kernel and jump to it.
;
; Put the FAT buffer's segment in CS to DS.
                push    cs
                pop     ds


;       loadFile: Loads the file into memory, one cluster at a time.

; Point ES:BX to the user read buffer.
                les     bx, [loadsegoff_60]   ; set ES:BX to load address 60:0

; Point DS:SI to the FAT buffer.
                mov     si, FATBUF      ; set DS:SI to the FAT chain

; Put the cluster number [DS:SI] in the FAT buffer to AX.
cluster_next:   lodsw                           ; AX = next cluster to read
; Test whether the cluster number is 0 which means EOF.
                or      ax, ax                  ; EOF?
; If the cluster number is not EOF, jump to `load_next`.
                jne     load_next               ; no, continue
; If the cluster number is EOF, it means the kernel has been fully loaded.
; Put the drive number to BL.
                mov     bl,dl ; drive (left from readDisk)
; Jump to run the kernel.
                jmp     far [loadsegoff_60]     ; yes, pass control to kernel

; Code below aims to load one cluster of the kernel file.
;
; Decrease the cluster number by 2 to get the 0-based sector number.
load_next:      dec     ax                      ; cluster numbers start with 2
                dec     ax

; Put the number of sectors per cluster to DI.
; The higher byte in DI is unused.
                mov     di, word [bsSecPerClust]
; Mask off the higher byte in DI.
; DI specifies the number of sectors to read for `readDisk` below.
                and     di, 0xff                ; DI = sectors per cluster
; Multiply the cluster number in AX by the number of sectors per cluster in DI
; to get the sector number, relative to the FAT data region's sector number.
; DX:AX = AX * DI.
; Now DX:AX stores the relative sector number.
                mul     di
; Add lower 2 bytes of the FAT data region's sector number to AX.
; If overflow, CF becomes 1.
                add     ax, [data_start]
; Add higher 2 bytes of the FAT data region's sector number and CF to AX.
; Now DX:AX stores the absolute sector number.
; DX:AX specifies the starting sector number for `readDisk` below.
                adc     dx, [data_start+2]      ; DX:AX = first sector to read
; Read one cluster of the kernel file to the user read buffer.
                call    readDisk
; Jump to `cluster_next`.
                jmp     short cluster_next

; shows text after the call to this function.

; Print the string following the caller's call instruction.
; The following string's offset is pushed by the caller's call instruction.
;
; Pop the offset of next character to SI.
show:           pop     si
; Put the character in [DS:SI] to AL.
; SI is incremented.
; Now SI points to one byte after the character.
; If the character is `.`, it will be the last character to print, then SI
; points to the next instruction to return to.
                lodsb                           ; get character
; Push SI as the potential return address.
                push    si                      ; stack up potential return address
; Put 0x0E to AH.
; 0x0E means TTY mode for interrupt 0x10 video service.
                mov     ah,0x0E                 ; show character
; Invoke interrupt 0x10 video service to print the character in AL.
                int     0x10                    ; via "TTY" mode
; Test whether the character is `.`.
                cmp     al,'.'                  ; end of string?
; If the character is not `.`, jump to print the next character.
                jne     show                    ; until done
; If the character is `.`, return.
                ret

; Print error message.
boot_error:     call    show
;                db      "Error! Hit a key to reboot."
; Error message.
                db      "Error!."

; Put 0 to AH.
                xor     ah,ah
; Invoke interrupt 0x13 AH=0 service to reset the disk.
                int     0x13                    ; reset floppy
; Invoke interrupt 0x16 AH=0 service to wait for a key press.
                int     0x16                    ; wait for a key
; Invoke interrupt 0x19 AH=0 service to reboot.
                int     0x19                    ; reboot the machine


;       readDisk:       Reads a number of sectors into memory.
;
;       Call with:      DX:AX = 32-bit DOS sector number
;                       DI = number of sectors to read
;                       ES:BX = destination buffer
;
;       Returns:        CF set on error
;                       ES:BX points one byte after the last byte read.

; Read disk sectors to the read buffer, then copy to the destination buffer.
;
; Push SI.
readDisk:       push    si

; Put the sector number to read to fields `LBA_SECTOR_0` and `LBA_SECTOR_16`.
                mov     LBA_SECTOR_0,ax
                mov     LBA_SECTOR_16,dx
; Put the destination buffer's segment to [READADDR_SEG].
                mov     word [READADDR_SEG], es
; Put the destination buffer's offset to [READADDR_OFF].
                mov     word [READADDR_OFF], bx

; Print the following message.
; (gdb) break *0x27B6C
                call    show
; Message.
; 0x1FE0:0x7D6F
                db      "."
read_next:

;******************** LBA_READ *******************************

                                                ; check for LBA support

; Specify to use interrupt 0x13 AH=0x41 service.
                mov     ah,041h                 ;
; Put 0x55AA to BX, as required by interrupt 0x13 AH=0x41 service.
                mov     bx,055aah               ;
; Put the drive number to DL, as required by interrupt 0x13 AH=0x41 service.
                mov     dl, [drive]

                ; NOTE: sys must be updated if location changes!!!
; Test whether the drive number is 0 which means the first floppy disk.
                test    dl,dl                   ; don't use LBA addressing on A:
; If the drive number is 0, jump to `read_normal_BIOS`.
                jz      read_normal_BIOS        ; might be a (buggy)
                                                ; CDROM-BOOT floppy emulation

; Invoke interrupt 0x13 AH=0x41 service to check extensions present.
; If extensions are not present, CF is 1. If present, CX stores the flags:
; 1 – Device access using the LBA packet.
; 2 – Drive locking and ejecting.
; 4 – Enhanced disk drive support.
                int     0x13
; If extensions are not present, jump to `read_normal_BIOS`.
                jc      read_normal_BIOS

; Right-shift CX by 1 bit.
; Now CF stores the lower 1 bit shifted out.
                shr     cx,1                    ; CX must have 1 bit set

; Test whether CF is 1.
; BX = 0xAA55 - 1 + CF - BX = 0xAA54 + CF - 0xAA55 = CF - 1.
                sbb     bx,0aa55h - 1           ; tests for carry (from shr) too!
; If CF is not 1 which means LBA addressing is not supported, jump to
; `read_normal_BIOS`.
                jne     read_normal_BIOS


                                                ; OK, drive seems to support LBA addressing

; Put the address of the LBA packet to SI, as required by interrupt 0x13
; AH=0x42 service.
                lea     si,[LBA_PACKET]

; Put 0 to field `LBA_SECTOR_32`.
                                                ; setup LBA disk block
                mov     LBA_SECTOR_32,bx        ; bx is 0 if extended 13h mode supported
; Put 0 to field `LBA_SECTOR_48`.
                mov     LBA_SECTOR_48,bx

; Specify to use interrupt 0x13 AH=0x42 service.
                mov     ah,042h

; Jump to `do_int13_read`.
                jmp short    do_int13_read



read_normal_BIOS:

;******************** END OF LBA_READ ************************
; Code block below aims to convert the sector number to read into CHS numbers
; to be used by interrupt 0x13 AH=0x02 service.
;
; Put the sector number to read to DX:CX.
                mov     cx,LBA_SECTOR_0
                mov     dx,LBA_SECTOR_16


                ;
                ; translate sector number to BIOS parameters
                ;

                ;
                ; abs = sector                          offset in track
                ;     + head * sectPerTrack             offset in cylinder
                ;     + track * sectPerTrack * nHeads   offset in platter
                ;

; Put the number of sectors per track to AL.
                mov     al, [sectPerTrack]
; Multiply the number of sectors per track by the number of heads to get the
; number of sectors per cylinder.
; AX = AL * [nHeads].
                mul     byte [nHeads]
; Exchange AX and CX.
; Now CX stores the number of sectors per cylinder.
; Now DX:AX stores the sector number to read.
                xchg    ax, cx
                ; cx = nHeads * sectPerTrack <= 255*63
                ; dx:ax = abs
; Divide the sector number to read by the number of sectors per cylinder.
; DX(remainder):AX(quotient) = DX:AX / CX.
; NOW AX stores the cylinder number.
; NOW DX stores the in-cylinder sector offset.
                div     cx
                ; ax = track, dx = sector + head * sectPertrack
; Exchange AX and DX.
; NOW AX stores the in-cylinder sector offset.
; NOW DX stores the cylinder number.
                xchg    ax, dx
                ; dx = track, ax = sector + head * sectPertrack
; Divide the in-cylinder sector offset by the number of sectors per track.
; AH(remainder):AL(quotient) = AX / [sectPerTrack].
; Now AL stores the head number, AH stores the in-track sector number.
                div     byte [sectPerTrack]
                ; dx =  track, al = head, ah = sector
; Put the cylinder number to CX.
                mov     cx, dx
                ; cx =  track, al = head, ah = sector

                ; the following manipulations are necessary in order to
                ; properly place parameters into registers.
                ; ch = cylinder number low 8 bits
                ; cl = 7-6: cylinder high two bits
                ;      5-0: sector
; Put the head number to DH.
                mov     dh, al                  ; save head into dh for bios
; CX stores both the cylinder number (10 bits, possible values are 0 to 1023)
; and the sector number (6 bits, possible values are 1 to 63).
; Layout:
; CX:        ---CH--- ---CL---
; Cylinder : 76543210 98
; Sector   :            543210
;
; Put the lower 8 bits of the cylinder number to CH.
; Put the higher 2 bits of the cylinder number to CL's lower 2 bits.
                xchg    ch, cl                  ; set cyl no low 8 bits
; Right-rotate CL's lower 2 bits to higher 2 bits.
                ror     cl, 1                   ; move track high bits into
                ror     cl, 1                   ; bits 7-6 (assumes top = 0)
; Put the in-track sector number to CL's lower 6 bits.
                or      cl, ah                  ; merge sector into cylinder
; Increment the in-track sector number to make it 1-based.
                inc     cx                      ; make sector 1-based (1-63)

; Point ES:BX to `readDisk`'s read buffer.
; ES:BX specifies interrupt 0x13 AH=0x02 service's read buffer.
                les     bx,[LBA_OFF]

; Specify to use interrupt 0x13 AH=0x02 service.
; AH=0x02 service means read sectors from drive using CHS addressing.
; AL=0x01 means read 1 sector.
                mov     ax, 0x0201
do_int13_read:
; Put the drive number to DL, as required by interrupt 0x13 AH=0x02 or
; interrupt 0x13 AH=0x42 service.
                mov     dl, [drive]
; Invoke interrupt 0x13 AH=0x02 service to read disk using CHS addressing, or
; invoke interrupt 0x13 AH=0x42 service to read disk using LBA addressing.
; If have error, CF becomes 1.
                int     0x13
; If have error, jump to `boot_error`.
                jc      boot_error              ; exit on error

; Code below aims to copy sectors from `readDisk`'s read buffer to the
; destination buffer.
;
; Put the number of bytes per sector to AX.
                mov     ax, word [bsBytesPerSec]

; Push the number of sectors to read in DI.
                push    di
; Put `readDisk`'s read buffer's offset to SI.
                mov     si,READBUF              ; copy read in sector data to
; Put the destination buffer's unfilled part's segment and offset to ES:DI.
                les     di,[READADDR_OFF]       ; user provided buffer
; Put the number of bytes per sector to CX.
                mov     cx, ax
;                shr     cx, 1                   ; convert bytes to word count
;                rep     movsw
; Copy one sector from `readDisk`'s read buffer to the destination buffer.
; Copy one byte from [DS:SI] to [ES:DI], repeat CX times.
; Each time SI and DI are incremented by 1, CX is decremented by 1.
                rep     movsb
; Pop the number of sectors to read to DI.
                pop     di

;               div     byte[LBA_PACKET]        ; luckily 16 !!
; Put 4 to CL, to be used as shift count below.
                mov     cl, 4
; Divide the number of bytes per sector by 16 to get the number of segments
; read.
                shr     ax, cl                  ; adjust segment pointer by increasing
; Increment the destination buffer's segment by the number of segments read.
                add     word [READADDR_SEG], ax ; by paragraphs read in (per sector)

; Increment the LBA packet's sector number's `LBA_SECTOR_0` field.
; If overflow, CF becomes 1.
                add     LBA_SECTOR_0,  byte 1
; Add CF to the LBA packet's sector number's `LBA_SECTOR_16` field.
                adc     LBA_SECTOR_16, byte 0   ; DX:AX = next sector to read
; Decrement the number of sectors to read in DI.
; If DI becomes 0, ZF becomes 1.
                dec     di                      ; if there is anything left to read,
; If the number of sectors to read is not 0, jump to `read_next`.
                jnz     read_next               ; continue

; Put the destination buffer's unfilled part's segment and offset to ES:BX.
                les     bx, [READADDR_OFF]
                ; clear carry: unnecessary since adc clears it
; Pop old SI, which was pushed by the first instruction of `readDisk`.
                pop     si
; Return from `readDisk`.
                ret

; Allocate zeros up to $$:0x01F1 exclusive.
; 0x01F1 + 15 = 512.
; The remaining 15 bytes below make the boot sector exactly 512 bytes.
       times   0x01f1-$+$$ db 0

; Kernel file name and two bytes of 0.
filename        db      "KERNEL  SYS",0,0

; Mark the boot sector as bootable.
sign            dw      0xAA55

%ifdef DBGPRNNUM
; DEBUG print hex digit routines
; Print lower 4 bits of AL as a hex digit.
PrintLowNibble:         ; Prints low nibble of AL, AX is destroyed
; Mask off higher 4 bits of AL.
        and  AL, 0Fh    ; ignore upper nibble
; Test whether AL is greater than 9.
        cmp  AL, 09h    ; if greater than 9, then don't base on '0', base on 'A'
; If AL is not greater than 9, jump to `.printme`.
        jbe .printme
; If AL is greater than 9, add 7 to AL to later convert AL to character A-F.
        add  AL, 7      ; convert to character A-F
        .printme:
; Convert AL to hex digit.
        add  AL, '0'    ; convert to character 0-9
; Put 0x0E to AH.
; 0x0E means TTY mode for interrupt 0x10 video service.
        mov  AH,0x0E    ; show character
; Invoke interrupt 0x10.
        int  0x10       ; via "TTY" mode
; Return.
        retn
; Print AL as two hex digits.
PrintAL:                ; Prints AL, AX is preserved
; Save AX.
        push AX         ; store value so we can process a nibble at a time
; Shift higher 4 bits of AL to lower 4 bits.
        shr  AL, 4              ; move upper nibble into lower nibble
; Print lower 4 bits of AL as a hex digit.
        call PrintLowNibble
; Restore AX.
        pop  AX         ; restore for other nibble
; Save AX.
        push AX         ; but save so we can restore original AX
; Print lower 4 bits of AL as a hex digit.
        call PrintLowNibble
; Restore AX.
        pop  AX         ; restore for other nibble
; Return.
        retn
; Print AX as hex digits.
PrintNumber:            ; Prints (in Hex) value in AX, AX is preserved
; Exchange AH and AL in order to print AH.
        xchg AH, AL     ; high byte 1st
; Print AL (the old AH value) as two hex digits.
        call PrintAL
; Exchange AH and AL in order to print AL.
        xchg AH, AL     ; now low byte
; Print AL as two hex digits.
        call PrintAL
; Return.
        retn
%endif

```

## boot32.asm
[boot/boot32.asm](https://github.com/FDOS/kernel/blob/9d5abfe25aeff1bdbe325d49bc2dcae493a351bb/boot/boot32.asm).
```
;   +--------+
;   |        |
;   |        |
;   |--------| 4000:0000
;   |        |
;   |  FAT   |
;   |        |
;   |--------| 2000:0000
;   |BOOT SEC|
;   |RELOCATE|
;   |--------| 1FE0:0000
;   |        |
;   |        |
;   |        |
;   |        |
;   |--------|
;   |BOOT SEC|
;   |ORIGIN  | 07C0:0000
;   |--------|
;   |        |
;   |        |
;   |        |
;   |--------|
;   |KERNEL  |
;   |LOADED  |
;   |--------| 0060:0000
;   |        |
;   +--------+

;%define MULTI_SEC_READ  1


; Set segment type.
segment .text

%define BASE            0x7c00

; Let offset base be 0x7C00.
                org     BASE

; The boot sector's entry point.
; Jump to `real_start`.
Entry:          jmp     short real_start
; NOP instruction for the third byte, as required by FAT specification.
        nop

; The `jmp` and `nop` above take 3 bytes, followed by FAT info variables.
; These variables are initialized when running `SYS.COM` to install the boot
; sector.
;
; The offsets of the FAT info variables:
;       bp is initialized to 7c00h
%define bsOemName       bp+0x03      ; OEM label
%define bsBytesPerSec   bp+0x0b      ; bytes/sector
%define bsSecPerClust   bp+0x0d      ; sectors/allocation unit
%define bsResSectors    bp+0x0e      ; # reserved sectors
%define bsFATs          bp+0x10      ; # of fats
%define bsRootDirEnts   bp+0x11      ; # of root dir entries
%define bsSectors       bp+0x13      ; # sectors total in image
%define bsMedia         bp+0x15      ; media descrip: fd=2side9sec, etc...
%define sectPerFat      bp+0x16      ; # sectors in a fat
%define sectPerTrack    bp+0x18      ; # sectors/track
%define nHeads          bp+0x1a      ; # heads
%define nHidden         bp+0x1c      ; # hidden sectors
%define nSectorHuge     bp+0x20      ; # sectors if > 65536
%define xsectPerFat     bp+0x24      ; Sectors/Fat
%define xrootClst       bp+0x2c      ; Starting cluster of root directory
%define drive           bp+0x40      ; Drive number

; Allocate 87 bytes of zeros from $$+3 (0x7C03) up to $$+0x5A (0x7C5A)
; exclusive.
        times   0x5a-$+$$ db 0

; The user read buffer's segment.
; The starting address is 0x0060:0x0000 = 1.5KB.
; The user read buffer will store the kernel in the end.
; The reason to choose the starting address 1.5KB is because the first 1.5KB
; of the memory stores BIOS' interrupt vector table and other data thus should
; not be overwritten.
%define LOADSEG         0x0060

; The FAT buffer's segment.
; The FAT buffer stores the kernel file's cluster numbers.
; The starting address is 0x2000:0x0000 = 128KB.
%define FATSEG          0x2000

; The offset of the variable storing the sector number of the last FAT sector
; read.
%define fat_sector      bp+0x48         ; last accessed sector of the FAT

; The offset of the variable storing the user read buffer's offset.
%define loadsegoff_60   bp+loadseg_off-Entry ; FAR pointer = 60:0
; The offset of the variable storing the user read buffer's segment.
%define loadseg_60  bp+loadseg_seg-Entry

; The offset of the variable storing the first FAT's sector number.
%define fat_start       bp+0x5e         ; first FAT sector
; The offset of the variable storing the FAT data region's sector number.
%define data_start      bp+0x62         ; first data sector
; The offset of the variable storing the in-sector mask.
; [fat_secmask] = `NumberOfClusterNumbersPerFATSector - 1`.
%define fat_secmask     bp+0x66     ; number of clusters in a FAT sector - 1
; The offset of the variable storing the shift count.
; [fat_secshift] = `log(2, NumberOfClusterNumbersPerFATSector)`.
%define fat_secshift    bp+0x68         ; fat_secmask+1 = 2^fat_secshift

;-----------------------------------------------------------------------
;   ENTRY
;-----------------------------------------------------------------------

real_start:     cld
; Put 0 to IF to disable maskable interrupts.
        cli
; Put 0 to AX.
                sub ax, ax
; Put 0 to DS.
        mov ds, ax
; Put 0x7C00 to BP.
                mov     bp, 0x7c00

; Put 0x1FE0 to AX.
        mov ax, 0x1FE0
; Put 0x1FE0 to ES.
        mov es, ax
; Put 0x7C00 to SI.
        mov si, bp
; Put 0x7C00 to DI.
        mov di, bp
; Put 256 to CX, to be used as repeat times below.
        mov cx, 0x0100
; Copy 2 bytes from [DS:SI] to [ES:DI], repeat 256 times.
; Each time SI and DI are incremented by 2, CX is decremented by 1.
        rep movsw           ; move boot code to the 0x1FE0:0x0000
; Jump to `cont` in the 0x1FE0 segment.
        jmp     word 0x1FE0:cont

; Variable storing the user read buffer's offset.
loadseg_off dw  0
; Variable storing the user read buffer's segment.
loadseg_seg dw  LOADSEG

; Put 0x1FE0 to DS.
cont:           mov     ds, ax
; Put 0x1FE0 to SS.
                mov     ss, ax
; Put 0x7BE0 (32B before 0x1FE0:0x7C00) to SP.
                lea     sp, [bp-0x20]
; Put 1 to IF to enable maskable interrupts.
        sti
; Put the drive number in DL to [drive].
; DL was set by BIOS before loading the boot sector.
; DL = 00h: 1st floppy disk.
; DL = 01h: 2nd floppy disk.
; DL = 80h: 1st hard disk.
; DL = 81h: 2nd hard disk.
; DL = e0h: 1st CD.
                mov     [drive], dl     ; BIOS passes drive number in DL

;                call    print
;                db      "Loading ",0

;      Calc Params
;      Fat_Start
; Put lower 2 bytes of the number of hidden sectors to SI.
        mov si, word [nHidden]
; Put higher 2 bytes of the number of hidden sectors to DI.
; Now DI:SI stores the number of hidden sectors.
        mov di, word [nHidden+2]
; Add the number of reserved sectors to SI.
; If overflow, CF becomes 1.
        add si, word [bsResSectors]
; Add CF to DI.
; Now DI:SI stores the number of hidden and reserved sectors, which is also the
; first FAT's sector number.
        adc di, byte 0

; Put lower 2 bytes of the first FAT's sector number to `[fat_start]`.
        mov word [fat_start], si
; Put higher 2 bytes of the first FAT's sector number to `[fat_start+2]`.
        mov word [fat_start+2], di
 ;  Data_Start
; Put the number of FATs to AL.
        mov al, [bsFATs]
; Extend AL to AX.
; Now AX stores the number of FATs.
        cbw
; Push the number of FATs in AX.
        push    ax
; Multiply the number of FATs by higher 2 bytes of the number of sectors per
; FAT.
; DX:AX = AX * [xsectPerFat+2].
        mul word [xsectPerFat+2]
; Add AX to higher 2 bytes of the first FAT's sector number.
        add di, ax
; Pop the number of FATs to AX.
        pop ax
; Multiply the number of FATs by lower 2 bytes of the number of sectors per
; FAT.
; DX:AX = AX * [xsectPerFat].
        mul word [xsectPerFat]
; Add lower 2 bytes of the first FAT's sector number in SI to AX.
; If overflow, CF becomes 1.
        add ax, si
; Add higher 2 bytes of the first FAT's sector number in DI and CF to DX.
; Now DX:AX stores the FAT data region's sector number.
        adc dx, di
; Put lower 2 bytes of the FAT data region's sector number to [data_start].
        mov word[data_start], ax
; Put higher 2 bytes of the FAT data region's sector number to [data_start+2].
; Now [data_start] stores the FAT data region's sector number.
        mov word[data_start+2], dx
;      fat_secmask
; Put the number of bytes per sector to AX.
        mov ax, word[bsBytesPerSec]
; Divide AX by 4 to get the number of cluster numbers per FAT sector.
; Notice one cluster number is 4 bytes.
        shr ax, 1
        shr ax, 1
; Subtract AX by 1.
; Now AX stores the in-sector mask `NumberOfClusterNumbersPerFATSector - 1`.
        dec ax
; Put the in-sector mask to [fat_secmask].
        mov word [fat_secmask], ax
;      fat_secshift
; cx = temp
; ax = fat_secshift
; Exchange AX and CX.
; Now AX is 0, CX stores `NumberOfClusterNumbersPerFATSector - 1`.
        xchg    ax, cx ; cx = 0 after movsw
; Add 1 to CX.
; Now CX stores `NumberOfClusterNumbersPerFATSector`.
        inc cx
secshift:   inc ax
; Right-shift CX by 1.
        shr cx, 1
; Test whether CX is 1.
        cmp cx, 1
; If CX is not 1, jump to `secshift`.
        jne secshift
; Now AX stores the shift count `log(2, NumberOfClusterNumbersPerFATSector)`.
; Put the shift count to [fat_secshift].
        mov byte [fat_secshift], al
; Put 0 to CX.
        dec cx

;       FINDFILE: Searches for the file in the root directory.
;
;       Returns:
;            DX:AX = first cluster of file

; Put 0 to lower 2 bytes of [fat_sector].
                mov     word [fat_sector], cx           ; CX is 0 after "dec"
; Put 0 to higher 2 bytes of [fat_sector].
                mov     word [fat_sector + 2], cx

; Put lower 2 bytes of the FAT root directory's cluster number to AX.
                mov     ax, word [xrootClst]
; Put higher 2 bytes of the FAT root directory's cluster number to DX.
                mov     dx, word [xrootClst + 2]
ff_next_cluster:
; Push higher 2 bytes of the FAT root directory's current cluster number in DX.
                push    dx                              ; save cluster
; Push lower 2 bytes of the FAT root directory's current cluster number in AX.
                push    ax
; Convert the FAT root directory's current cluster number in DX:AX to sector
; number.
; Now DX:AX stores the FAT root directory's current sector number.
; Now BX stores the number of sectors per cluster.
; If end-of-chain is met, CF becomes 1.
                call    convert_cluster
; If CF is 1, jump to `boot_error`.
                jc      boot_error                      ; EOC encountered

ff_next_sector:
; Push the number of remaining sectors of the current cluster in BX.
                push    bx                              ; save sector count

; Point ES:BX to the user read buffer.
; ES:BX specifies the destination buffer for `readDisk` below.
                les     bx, [loadsegoff_60]
; Read one sector of the current cluster of the FAT root directory to the user
; read buffer.
; Now DX:AX stores the next sector number.
; Now ES:BX points to the unfilled part of the read buffer.
                call    readDisk
; Push lower 2 bytes of the next sector number in DX.
                push    dx                              ; save sector
; Push higher 2 bytes of the next sector number in AX.
                push    ax

; Put the number of bytes per sector to AX.
                mov     ax, [bsBytesPerSec]

        ; Search for KERNEL.SYS file name, and find start cluster.
; Put 11 to CX, to be used as repeat times below.
; 11 means 8+3 style file name.
ff_next_entry:  mov     cx, 11
; Point SI to the kernel file name.
                mov     si, filename
; Put the remaining number of bytes of the current sector to DI.
                mov     di, ax
; Subtract the remaining number of bytes of the current sector by 32.
; Now ES:DI points to the n-th last directory entry.
                sub     di, 0x20
; Compare byte [DS:SI] with byte [ES:DI], repeat at most 11 times.
; Each time SI and DI are incremented by 1.
; If all 11 characters are equal, ZF becomes 1.
                repe    cmpsb
; If ZF is 1, jump to `ff_done`.
                jz      ff_done

; Subtract AX by 32.
; Now AX stores the remaining number of bytes of the current sector.
                sub     ax, 0x20
; IF AX is not 0, jump to `ff_next_entry`.
                jnz     ff_next_entry
; Pop lower 2 bytes of the next sector number to AX.
                pop     ax                      ; restore  sector
; Pop higher 2 bytes of the next sector number to DX.
                pop     dx
; Pop the number of remaining sectors of the current cluster to BX.
                pop     bx                      ; restore sector count
; Decrement the number of remaining sectors of the current cluster.
                dec     bx
; If BX is not 0, jump to `ff_next_sector`.
                jnz     ff_next_sector
ff_find_next_cluster:
; Pop lower 2 bytes of the FAT root directory's current cluster number to
; AX.
                pop     ax                      ; restore current cluster
; Pop higher 2 bytes of the FAT root directory's current cluster number to
; DX.
                pop     dx
; Put the FAT root directory's next cluster number to DX:AX.
                call    next_cluster
; Jump to `ff_next_cluster`.
                jmp     short ff_next_cluster
ff_done:

; Put lower 2 bytes of the first cluster number of the kernel file to AX.
; `-11` is because ES:DI is pointing to past the end of the file name field of
; the directory entry of the kernel file.
                mov     ax, [es:di+0x1A-11]        ; get cluster number
; Put higher 2 bytes of the first cluster number of the kernel file to DX.
                mov     dx, [es:di+0x14-11]
c4:
; Put 0 to BX.
; Now ES:BX points to the read buffer.
                sub     bx, bx                  ; ES points to LOADSEG
; Push higher 2 bytes of the current cluster number of the kernel file in DX.
c5:             push    dx
; Push lower 2 bytes of the current cluster number of the kernel file in AX.
                push    ax
; Push the remaining number of sectors of the current cluster in BX.
                push    bx
; Convert the cluster number in DX:AX to sector number.
; Now DX:AX stores the sector number.
; Now BX stores the number of sectors per cluster.
; If end-of-chain is met, CF becomes 1.
                call    convert_cluster
; If end-of-chain is met, jump to `boot_success`.
                jc      boot_success
; Put the number of sectors per cluster to DI.
                mov     di, bx
; Pop the remaining number of sectors of the current cluster to BX.
                pop     bx
c6:
; Read one sector into the read buffer.
; Now ES:BX points to the unfilled part of the read buffer.
                call    readDisk
; Decrement the remaining number of sectors of the current cluster.
                dec     di
; If the remaining number of sectors of the current cluster is not 0, jump to
; `c6`.
                jnz     c6
; Pop lower 2 bytes of the current cluster number of the kernel file to AX.
                pop     ax
; Pop higher 2 bytes of the current cluster number of the kernel file to DX.
                pop     dx
; Put the FAT root directory's next cluster number to DX:AX.
                call    next_cluster
; Jump to `c5`.
                jmp     short c5

boot_error:
; Put 0 to AH.
        xor ah,ah
; Invoke interrupt 0x16 AH=0 service to wait for a key press.
        int 0x16            ; wait for a key
; Invoke interrupt 0x19 AH=0 service to reboot.
        int 0x19            ; reboot the machine

; input:
;    DX:AX - cluster
; output:
;    DX:AX - next cluster
;    CX = 0
; modify:
;    DI
next_cluster:
; Push ES.
                push    es
; Put lower 2 bytes of the current cluster number to DI.
                mov     di, ax
; Mask DI with the in-sector mask `NumberOfClusterNumbersPerSector - 1`.
; Now DI stores the next cluster number's in-sector offset.
                and     di, [fat_secmask]

; Put the shift count to CX.
                mov     cx, [fat_secshift]
cn_loop:
; Right-shift DX by 1.
; Now CF stores the bit shifted out.
                shr     dx,1
; Right-carry-rotate AX by 1.
; The bit in CF becomes the highest bit of AX.
                rcr     ax,1
; Decrement the shift count in CX.
                dec     cx
; If the shift count is not 0, jump to `cn_loop`.
                jnz     cn_loop                ; DX:AX fat sector where our
                                               ; cluster resides
                                               ; DI - cluster index in this
                                               ; sector
; Now DX:AX stores the next cluster number's FAT sector number, relative to the
; the first FAT's sector number.

; Multiply DI by 4 to get the next cluster number's byte offset from the FAT
; buffer.
; Notice a cluster number is 4 bytes.
                shl     di,1                   ; DI - offset in the sector
                shl     di,1
; Add lower 2 bytes of the first FAT's sector number to AX.
; If overflow, CF becomes 1.
                add     ax, [fat_start]
; Add higher 2 bytes of the first FAT's sector number and CF to DX.
; Now DX:AX stores the next cluster number's FAT sector absolute number.
                adc     dx, [fat_start+2]      ; DX:AX absolute fat sector

; Push BX.
                push    bx
; Put the FAT buffer's segment to BX.
                mov     bx, FATSEG
; Put the FAT buffer's segment to ES.
                mov     es, bx
; Put 0 to BX.
; Now ES:BX points to the FAT buffer.
                sub     bx, bx

; Compare lower 2 bytes of the sector number of the FAT sector holding the next
; cluster number with lower 2 bytes of the sector number of the FAT sector last
; read.
                cmp     ax, [fat_sector]
; If not equal, jump to `cn1`.
                jne     cn1                    ; if the last fat sector we
                                               ; read was this, than skip
; Compare higher 2 bytes of the sector number of the FAT sector holding the
; next cluster number with higher 2 bytes of the sector number of the FAT
; sector last read.
                cmp     dx,[fat_sector+2]
; If equal, jump to `cn_exit`.
                je      cn_exit
cn1:
; Put lower 2 bytes of the next cluster number's FAT sector number in AX to
; [fat_sector].
                mov     [fat_sector],ax        ; save the fat sector number,
; Put higher 2 bytes of the next cluster number's FAT sector number in DX to
; [fat_sector+2].
                mov     [fat_sector+2],dx      ; we are going to read
; Read the next cluster number's FAT sector into the user read buffer.
                call    readDisk
cn_exit:
; Pop old BX.
                pop     bx
; Put lower 2 bytes of the next cluster number to AX.
                mov     ax, [es:di]             ; DX:AX - next cluster
; Put higher 2 bytes of the next cluster number to DX.
                mov     dx, [es:di + 2]         ;
; Pop old ES.
                pop     es
; Return.
                ret


boot_success:
; Put the drive number to BL.
                mov     bl, [drive]
; Jump to run the loaded kernel.
        jmp far [loadsegoff_60]

; Convert cluster to the absolute sector
;input:
;    DX:AX - target cluster
;output:
;    DX:AX - absoulute sector
;    BX - [bsSectPerClust]
;modify:
;    CX
convert_cluster:
; 0x0FFFFFF8 means end-of-chain.
; Compare DX with 0x0FFF.
                cmp     dx,0x0fff
; If DX is not 0x0FFF, jump to `c3`.
                jne     c3
; Compare AX with 0xFFF8.
                cmp     ax,0xfff8
; If AX < 0xFFF8, jump to `c3`.
                jb      c3              ; if cluster is EOC (carry is set), do ret
; If AX >= 0xFFF8, put 1 to CF to indicate end-of-chain.
                stc
; Return.
                ret
c3:
; Push higher 2 bytes of the FAT root directory's cluster number in DX to CX.
                mov     cx, dx          ; sector = (cluster - 2)*clussize +
                                        ; + data_start
; Subtract lower 2 bytes of the FAT root directory's cluster number in AX by 2.
; If underflow, CF becomes 1.
                sub     ax, 2
; Subtract CX by CF.
; Now CX:AX stores the 0-based cluster number.
                sbb     cx, byte 0           ; CX:AX == cluster - 2
; Put the number of sectors per cluster to BL.
                mov     bl, [bsSecPerClust]
; Put 0 to BH.
; Now BX stores the number of sectors per cluster.
                sub     bh, bh
; Exchange CX and AX.
; Now AX:CX stores the 0-based cluster number.
                xchg    cx, ax          ; AX:CX == cluster - 2
; Multiply higher 2 bytes of the 0-based cluster number in AX by the number of
; sectors per cluster in BX.
; DX:AX = AX * BX.
                mul     bx              ; first handle high word
                                        ; DX must be 0 here
; Exchange CX and AX.
; Now AX stores lower 2 bytes of the 0-based cluster number.
; Now CX stores the result of multiplying higher 2 bytes of the 0-based cluster
; number by the number of sectors per cluster.
                xchg    ax, cx          ; then low word
; Multiply lower 2 bytes of the 0-based cluster number in AX by the number of
; sectors per cluster in BX.
; DX:AX = AX * BX.
                mul     bx
; Add the result of multiplying higher 2 bytes of the 0-based cluster number by
; the number of sectors per cluster in CX to DX.
; Now DX stores higher 2 bytes of the sector number, relative to the FAT data
; region's sector number.
                add     dx, cx                          ; DX:AX target sector
; Add lower 2 bytes of the FAT data region's sector number to AX.
; Now AX stores lower 2 bytes of the absolute sector number.
; If overflow, CF becomes 1.
                add     ax, [data_start]
; Add higher 2 bytes of the FAT data region's sector number and CF to DX.
; Now DX stores higher 2 bytes of the absolute sector number.
                adc     dx, [data_start + 2]
; Return.
                ret

; prints text after call to this function.

print_1char:
; Put 0 to BX.
; BH is page number.
; BL is color.
                xor   bx, bx                   ; video page 0
; Put 0x0E to AH.
; 0x0E means TTY mode for interrupt 0x10 video service.
                mov   ah, 0x0E                 ; else print it
; Invoke interrupt 0x10 video service to print the character in AL.
                int   0x10                     ; via TTY mode
; Pop the offset of the next character to SI.
print:          pop   si                       ; this is the first character
; Put the character in [DS:SI] to AL.
; SI is incremented.
; Now SI points to one byte after the character.
; If the character in AL is value 0, it means end of characters, then SI points
; to the next instruction to return to.
print1:         lodsb                          ; get token
; Push SI as the potential return address.
                push  si                       ; stack up potential return address
; Test whether the character in AL is value 0.
                cmp   al, 0                    ; end of string?
; If the character in AL is not value 0, jump to `print_1char`.
                jne   print_1char              ; until done
; If the character in AL is value 0, return.
                ret                            ; and jump to it

;input:
;   DX:AX - 32-bit DOS sector number
;   ES:BX - destination buffer
;output:
;   ES:BX points one byte after the last byte read.
;   DX:AX - next sector
;modify:
;   ES if DI * bsBytesPerSec >= 65536, CX

readDisk:
; Push higher 2 bytes of the sector number in DX.
read_next:      push    dx
; Push lower 2 bytes of the sector number in AX.
                push    ax
                ;
                ; translate sector number to BIOS parameters
                ;

                ;
                ; abs = sector                          offset in track
                ;     + head * sectPerTrack             offset in cylinder
                ;     + track * sectPerTrack * nHeads   offset in platter
                ;
; Exchange AX and CX.
; Now CX stores lower 2 bytes of the sector number.
                xchg    ax, cx
; Put the number of sectors per track in AL.
                mov     al, [sectPerTrack]
; Multiply the number of sectors per track by the number of heads to get the
; number of sectors per cylinder.
; AX = AL * [nHeads].
                mul     byte [nHeads]
; Exchange AX and CX.
; Now AX stores lower 2 bytes of the sector number.
; Now CX stores the number of sectors per cylinder.
                xchg    ax, cx
                ; cx = nHeads * sectPerTrack <= 255*63
                ; dx:ax = abs
; Divide the sector number to read by the number of sectors per cylinder.
; DX(remainder):AX(quotient) = DX:AX / CX.
; NOW AX stores the cylinder number.
; NOW DX stores the in-cylinder sector offset.
                div     cx
                ; ax = track, dx = sector + head * sectPertrack
; Exchange AX and DX.
; NOW AX stores the in-cylinder sector offset.
; NOW DX stores the cylinder number.
                xchg    ax, dx
                ; dx = track, ax = sector + head * sectPertrack
; Divide the in-cylinder sector offset by the number of sectors per track.
; AH(remainder):AL(quotient) = AX / [sectPerTrack].
; Now AL stores the head number, AH stores the in-track sector number.
                div     byte [sectPerTrack]
                ; dx =  track, al = head, ah = sector
; Put the cylinder number to CX.
                mov     cx, dx
                ; cx =  track, al = head, ah = sector

                ; the following manipulations are necessary in order to
                ; properly place parameters into registers.
                ; ch = cylinder number low 8 bits
                ; cl = 7-6: cylinder high two bits
                ;      5-0: sector
; Put the head number to DH.
                mov     dh, al                  ; save head into dh for bios
; CX stores both the cylinder number (10 bits, possible values are 0 to 1023)
; and the sector number (6 bits, possible values are 1 to 63).
; Layout:
; CX:        ---CH--- ---CL---
; Cylinder : 76543210 98
; Sector   :            543210
;
; Put the lower 8 bits of the cylinder number in CH.
; Put the higher 2 bits of the cylinder number in CL's lower 2 bits.
                xchg    ch, cl                  ; set cyl no low 8 bits
; Right-rotate CL's lower 2 bits to higher 2 bits.
                ror     cl, 1                   ; move track high bits into
                ror     cl, 1                   ; bits 7-6 (assumes top = 0)
; Increment the in-track sector number to make it 1-based.
                inc     ah                      ; sector offset from 1
; Put the in-track sector number in CL's lower 6 bits.
                or      cl, ah                  ; merge sector into cylinder

; Specify to use interrupt 0x13 AH=0x02 service.
; AH 0x02 service means read sectors from drive using CHS addressing.
; AL 0x01 means read 1 sector.
                mov     ax, 0x0201
; Put the drive number to DL.
                mov     dl, [drive]
; Invoke interrupt 0x13 AH=0x02 service to read disk using CHS addressing.
; If have error, CF becomes 1.
                int     0x13

; Pop lower 2 bytes of the sector number to AX.
                pop     ax
; Pop higher 2 bytes of the sector number to DX.
                pop     dx
; If no error, jump to `read_ok`.
                jnc     read_ok                 ; jump if no error
; Specify to use interrupt 0x13 AH=0 service.
                xor     ah, ah                  ; else, reset floppy
; Invoke interrupt 0x13 AH=0 service to reset the disk.
                int     0x13
; Jump to `read_next`.
                jmp     short read_next
read_ok:
; Increment BX by the number of bytes per sector.
; Now ES:BX points to the unfilled part of the read buffer.
; If overflow, CF becomes 1.
                add     bx, word [bsBytesPerSec]

; If CF is 0, jump to `no_incr_es`.
                jnc     no_incr_es              ; if overflow...

; If CF is 1.
; Put ES to CX.
                mov     cx, es
; Add 0x1000 to CX, which means pointing ES to the next 0x10000 bytes segment.
; Notice BX overflows around and BX can address 0x10000 bytes (64KB).
                add     ch, 0x10                ; ...add 1000h to ES
; Put CX to ES.
                mov     es, cx

no_incr_es:
; Increment AX.
; If overflow, CF becomes 1.
                add     ax,byte 1
; Add CF to DX.
                adc     dx,byte 0
; Return.
                ret

; Allocate zeros up to $$:0x01F1 exclusive.
; 0x01F1 + 15 = 512.
; The remaining 15 bytes below make the boot sector exactly 512 bytes.
       times   0x01f1-$+$$ db 0

; Kernel file name and two bytes of 0.
filename        db      "KERNEL  SYS",0,0

; Mark the boot sector as bootable.
sign            dw      0xAA55

```

## boot32lb.asm
[boot/boot32lb.asm](https://github.com/FDOS/kernel/blob/9d5abfe25aeff1bdbe325d49bc2dcae493a351bb/boot/boot32lb.asm).
```
; This is an LBA-enabled FreeDOS FAT32 boot sector (single sector!).
; You can use and copy source code and binaries under the terms of the
; GNU Public License (GPL), version 2 or newer. See www.gnu.org for more.

; Based on earlier work by FreeDOS kernel hackers, modified heavily by
; Eric Auer and Jon Gentle in 7 / 2003.
;
; Features: Uses LBA and calculates all variables from BPB/EBPB data,
; thus making partition move / resize / image-restore easier. FreeDOS
; can boot from FAT32 partitions which start > 8 GB boundary with this
; boot sector. Disk geometry knowledge is not needed for booting.
;
; Windows uses 2-3 sectors for booting (sector stage, statistics sector,
; filesystem stage). Only using 1 sector for FreeDOS makes multi-booting
; of FreeDOS and Windows on the same filesystem easier.
;
; Requirements: LBA BIOS and 386 or better CPU. Use the older CHS-only
; boot sector if you want FAT32 on really old PCs (problems: you cannot
; boot from > 8 GB boundary, cannot move / resize / ... without applying
; SYS again if you use the CHS-only FAT32 boot sector).
;
; FAT12 / FAT16 hints: Use the older CHS-only boot sector unless you
; have to boot from > 8 GB. The LBA-and-CHS FAT12 / FAT16 boot sector
; needs applying SYS again after move / resize / ... a variant of that
; boot sector without CHS support but with better move / resize / ...
; support would be good for use on LBA harddisks.


; Memory layout for the FreeDOS FAT32 single stage boot process:

;   ...
;   |-------| 1FE0:7E00
;   |BOOTSEC|
;   |RELOC. |
;   |-------| 1FE0:7C00
;   ...
;   |-------| 2000:0200
;   |  FAT  | (only 1 sector buffered)
;   |-------| 2000:0000
;   ...
;   |-------| 0000:7E00
;   |BOOTSEC| overwritten by the kernel, so the
;   |ORIGIN | bootsector relocates itself up...
;   |-------| 0000:7C00
;   ...
;   |-------|
;   |KERNEL | maximum size 134k (overwrites bootsec origin)
;   |LOADED | (holds 1 sector directory buffer before kernel load)
;   |-------| 0060:0000
;   ...

; Set segment type.
segment .text

; Let offset base be 0x7C00.
        org 0x7c00      ; this is a boot sector

; The boot sector's entry point.
; Jump to `real_start`.
Entry:      jmp short real_start
; NOP instruction for the third byte, as required by FAT specification.
        nop

; The `jmp` and `nop` above take 3 bytes, followed by FAT info variables.
; These variables are initialized when running `SYS.COM` to install the boot
; sector.
;
; The offsets of the FAT info variables:
;   bp is initialized to 7c00h
; %define bsOemName bp+0x03 ; OEM label (8)
%define bsBytesPerSec   bp+0x0b ; bytes/sector (dw)
%define bsSecPerClust   bp+0x0d ; sectors/allocation unit (db)
%define bsResSectors    bp+0x0e ; # reserved sectors (dw)
%define bsFATs      bp+0x10 ; # of fats (db)
; %define bsRootDirEnts bp+0x11 ; # of root dir entries (dw, 0 for FAT32)
            ; (FAT32 has root dir in a cluster chain)
; %define bsSectors bp+0x13 ; # sectors total in image (dw, 0 for FAT32)
            ; (if 0 use nSectorHuge even if FAT16)
; %define bsMedia   bp+0x15 ; media descriptor: fd=2side9sec, etc... (db)
; %define sectPerFat    bp+0x16 ; # sectors in a fat (dw, 0 for FAT32)
            ; (FAT32 always uses xsectPerFat)
%define sectPerTrack    bp+0x18 ; # sectors/track
; %define nHeads    bp+0x1a ; # heads (dw)
%define nHidden     bp+0x1c ; # hidden sectors (dd)
; %define nSectorHuge   bp+0x20 ; # sectors if > 65536 (dd)
%define xsectPerFat bp+0x24 ; Sectors/Fat (dd)
            ; +0x28 dw flags (for fat mirroring)
            ; +0x2a dw filesystem version (usually 0)
%define xrootClst   bp+0x2c ; Starting cluster of root directory (dd)
            ; +0x30 dw -1 or sector number of fs.-info sector
            ; +0x32 dw -1 or sector number of boot sector backup
            ; (+0x34 .. +0x3f reserved)
%define drive       bp+0x40 ; Drive number
%define loadsegoff_60   bp+loadseg_off-Entry

; The user read buffer's segment.
; The starting address is 0x0060:0x0000 = 1.5KB.
; The user read buffer will store the kernel in the end.
; The reason to choose the starting address 1.5KB is because the first 1.5KB
; of the memory stores BIOS' interrupt vector table and other data thus should
; not be overwritten.
%define LOADSEG     0x0060

; The FAT buffer's segment.
; The FAT buffer stores the kernel file's cluster numbers.
; The starting address is 0x2000:0x0000 = 128KB.
%define FATSEG      0x2000

; The offset of the variable storing the shift count.
; [fat_secshift] = `log(2, NumberOfClusterNumbersPerFATSector)`.
%define fat_secshift    fat_afterss-1   ; each fat sector describes 2^??
                    ; clusters (db) (selfmodifying)
; The offset of the variable storing the sector number of the last FAT sector
; read.
%define fat_sector  bp+0x44     ; last accessed FAT sector (dd)
                    ; (overwriting unused bytes)
; The offset of the variable storing the first FAT's sector number.
%define fat_start   bp+0x48     ; first FAT sector (dd)
                    ; (overwriting unused bytes)
; The offset of the variable storing the FAT data region's sector number.
%define data_start  bp+0x4c     ; first data sector (dd)
                    ; (overwriting unused bytes)

; Allocate 87 bytes of zeros from $$+3 (0x7C03) up to $$+0x5A (0x7C5A)
; exclusive.
        times   0x5a-$+$$ db 0
        ; not used: [0x42] = byte 0x29 (ext boot param flag)
        ; [0x43] = dword serial
        ; [0x47] = label (padded with 00, 11 bytes)
        ; [0x52] = "FAT32",32,32,32 (not used by Windows)
        ; ([0x5a] is where FreeDOS parts start)

;-----------------------------------------------------------------------
; ENTRY
;-----------------------------------------------------------------------

real_start: cld
; Put 0 to IF to disable maskable interrupts.
        cli
; Put 0 to AX.
        sub ax, ax
; Put 0 to DS.
        mov ds, ax
; Put 0x7C00 to BP.
        mov bp, 0x7c00

; Put 0x1FE0 to AX.
        mov ax, 0x1FE0
; Put 0x1FE0 to ES.
        mov es, ax
; Put 0x7C00 to SI.
        mov si, bp
; Put 0x7C00 to DI.
        mov di, bp
; Put 256 to CX, to be used as repeat times below.
        mov cx, 0x0100
; Copy 2 bytes from [DS:SI] to [ES:DI], repeat 256 times.
; Each time SI and DI are incremented by 2, CX is decremented by 1.
        rep movsw       ; move boot code to the 0x1FE0:0x0000
; Jump to `cont` in the 0x1FE0 segment.
        jmp word 0x1FE0:cont

; Variable storing the user read buffer's offset and segment.
loadseg_off dw  0, LOADSEG

; -------------

; Put 0x1FE0 to DS.
cont:       mov ds, ax
; Put 0x1FE0 to SS.
        mov ss, ax      ; stack and BP-relative moves up, too
; Put 0x7BE0 (32B before 0x1FE0:0x7C00) to SP.
                lea     sp, [bp-0x20]
; Put 1 to IF to enable maskable interrupts.
        sti
; Put the drive number in DL to [drive].
; DL was set by BIOS before loading the boot sector.
; DL = 00h: 1st floppy disk.
; DL = 01h: 2nd floppy disk.
; DL = 80h: 1st hard disk.
; DL = 81h: 2nd hard disk.
; DL = e0h: 1st CD.
        mov [drive], dl ; BIOS passes drive number in DL

; Put the message address to SI.
        mov si, msg_LoadFreeDOS
; Print the message.
        call    print       ; modifies AX BX SI


; -------------

;   CALCPARAMS: figure out where FAT and DATA area starts
;   (modifies EAX EDX, sets fat_start and data_start variables)

; Put 0 to EAX.
calc_params:    xor eax, eax
; Put 0 to [fat_sector].
        mov [fat_sector], eax   ; init buffer status

        ; first, find fat_start:
; Put the number of reserved sectors to AX.
        mov ax, [bsResSectors]  ; no movzx eax, word... needed
; Add the number of hidden sectors to EAX.
; Now EAX stores the FAT's sector number.
        add eax, [nHidden]
; Put the FAT's sector number to [fat_start].
        mov     [fat_start], eax    ; first FAT sector
; Put the FAT's sector number to [data_start].
        mov [data_start], eax   ; (only first part of value)

        ; next, find data_start:
; Put the number of FATs to EAX.
        mov eax, [bsFATs]       ; no movzx ... byte needed:
        ; the 2 dw after the bsFATs db are 0 by FAT32 definition :-).
; Multiply the number of FATs by the number of sectors per FAT.
; EDX:EAX = EAX * [xsectPerFat].
; Now EDX:EAX stores the number of FAT sectors.
        imul    dword [xsectPerFat] ; (also changes edx)
; Add the number of FAT sectors to [data_start].
; Now [data_start] stores the FAT data region's sector number.
        add [data_start], eax   ; first DATA sector
                        ; (adding in RAM is shorter!)

        ; finally, find fat_secshift:
; Put 512 to AX.
; This corresponds to the initial value `7` of the shift count [fat_secshift].
        mov ax, 512 ; default sector size (means default shift)
                ; shift = log2(secSize) - log2(fatEntrySize)
;---        mov cl, 9-2 ; shift is 7 for 512 bytes per sector
; Compare AX with the number of bytes per sector.
fatss_scan: cmp ax, [bsBytesPerSec]
; If equal, jump to `fatss_found`.
        jz  fatss_found
; If not equal, multiply AX by 2.
        add ax,ax
;---        inc cx
; Increment the shift count.
; The initial value is 7.
        inc word [fat_secshift] ;XXX    ; initially 9-2 (byte!)
; Jump to `fatss_scan`.
        jmp     short fatss_scan    ; try other sector sizes
fatss_found:
;---        mov [fat_secshift], cl

; -------------

; FINDFILE: Searches for the file in the root directory.
; Returns:  EAX = first cluster of file

; Put the FAT root directory's cluster number to EAX.
        mov eax, [xrootClst]    ; root dir cluster

; Push the FAT root directory's current cluster number in EAX.
ff_next_clust:  push    eax         ; save cluster
; Convert the cluster number in EAX to sector number.
; Now EAX stores the sector number.
; Now EDX stores the number of sectors per cluster.
; If end-of-chain is met, CF becomes 1.
        call    convert_cluster
; If end-of-chain is met, jump to `boot_error`.
        jc  boot_error      ; EOC encountered
        ; EDX is clust/sector, EAX is sector

; Point ES:BX to the user read buffer.
; ES:BX specifies the destination buffer for `readDisk` below.
ff_next_sector: les bx, [loadsegoff_60] ; load to loadseg:0
; Read one sector of the FAT root directory.
        call    readDisk
;---        push    eax         ; save sector

;---        xor ax, ax      ; first dir. entry in this sector
; Put 0 to DI.
; Now ES:DI points to the user read buffer.
        xor di, di          ;XXX

        ; Search for KERNEL.SYS file name, and find start cluster.
; Put 11 to CX, to be used as repeat times below.
; 11 means 8+3 style file name.
ff_next_entry:  mov cx, 11
; Point SI to the kernel file name.
        mov si, filename
;---        mov di, ax
; Compare byte [DS:SI] with byte [ES:DI], repeat at most 11 times.
; Each time SI and DI are incremented by 1.
; If all 11 characters are equal, ZF becomes 1.
        repe    cmpsb
; If the file name is found, jump to `ff_done`.
        jz  ff_done     ; note that di now is at dirent+11

;---        add ax, 0x20        ; next directory entry
;---        cmp     ax, [bsBytesPerSec] ; end of sector reached?
; Increment DI by 32 bytes to point to the next directory entry.
        add di, byte 0x20       ;XXX
; Bitwise-AND DI with 0xFFE0 to mask off the least 5 bits.
; The result is a multiple of 32.
        and di, byte -0x20 ; 0xffe0 ;XXX
; Compare DI with the number of bytes per sector.
        cmp di, [bsBytesPerSec] ;XXX
; If not equal, jump to `ff_next_entry`.
        jnz ff_next_entry

;---        pop eax     ; restore sector
; Decrement the number of remaining sectors of the current cluster in DX.
        dec     dx      ; next sector in cluster
; If the number of remaining sectors of the current cluster in DX is not 0,
; jump to `ff_next_sector` to process the next sector.
        jnz ff_next_sector

; Pop the FAT root directory's current cluster number in EAX.
ff_walk_fat:    pop eax         ; restore current cluster
; Put the FAT root directory's next cluster number to EAX.
        call    next_cluster        ; find next cluster
; Jump to `ff_next_clust`.
        jmp ff_next_clust

; Push lower 2 bytes of the first cluster number of the kernel file.
; `-11` is because ES:DI is pointing to past the end of the file name field of
; the directory entry of the kernel file.
ff_done:    push    word [es:di+0x14-11]    ; get cluster number HI
; Push higher 2 bytes of the first cluster number of the kernel file.
        push    word [es:di+0x1A-11]    ; get cluster number LO
; Pop the first cluster number of the kernel file to EAX.
        pop eax         ; convert to 32bit

; Put 0 to BX.
; Now ES:BX points to the user read buffer.
        sub bx, bx          ; ES points to LOADSEG
                        ; (kernel -> ES:BX)

; -------------

; Push the current cluster number of the kernel file in EAX.
read_kernel:    push    eax
; Convert the current cluster number in EAX to sector number.
; Now EAX stores the starting sector number of the current cluster of the
; kernel file.
; Now EDX stores the number of sectors per cluster.
        call    convert_cluster
; If end-of-chain is met, jump to `boot_success`.
        jc  boot_success        ; EOC encountered - done
        ; EDX is sectors in cluster, EAX is sector

; Read one sector of the kernel file.
rk_in_cluster:  call    readDisk
; Decrement the number of sectors to read in DX.
        dec dx
; If the number of sectors to read in DX is not 0, jump to `rk_in_cluster`.
        jnz rk_in_cluster       ; loop over sect. in cluster

; Pop the kernel file's current cluster number to EAX.
rk_walk_fat:    pop eax
; Put the kernel file's next cluster number to EAX.
        call    next_cluster
; Jump to read the kernel file's next cluster.
        jmp read_kernel

;-----------------------------------------------------------------------

; Put the drive number to BL.
boot_success:   mov bl, [drive]
; Jump to run the loaded kernel.
        jmp far [loadsegoff_60]

;-----------------------------------------------------------------------

; Point SI to the error message.
boot_error: mov si, msg_BootError
; Print the error message.
        call    print           ; modifies AX BX SI

; Put 0 to AH.
wait_key:   xor ah,ah
; Invoke interrupt 0x16 AH=0 service to wait for a key press.
        int 0x16            ; wait for a key
; Invoke interrupt 0x19 AH=0 service to reboot.
reboot:     int 0x19            ; reboot the machine

;-----------------------------------------------------------------------

; given a cluster number, find the number of the next cluster in
; the FAT chain. Needs fat_secshift and fat_start.
; input:    EAX - cluster
; output:   EAX - next cluster

; Push ES.
next_cluster:   push    es
; Push DI.
        push    di
; Push BX.
        push    bx

; Put the current cluster number in AX to DI.
        mov di, ax
; Multiply DI by 4 to get the next cluster number's byte offset from the FAT
; buffer.
; Notice a cluster number is 4 bytes.
        shl di, 2           ; 32bit FAT

; Push lower 2 bytes of the current cluster number in AX.
        push    ax
; Put the number of bytes per sector to AX.
        mov ax, [bsBytesPerSec]
; Subtract the number of bytes per sector in AX by 1 to get the in-sector mask.
        dec ax
; Mask DI to get the in-sector offset.
        and di, ax          ; mask to sector size
; Pop lower 2 bytes of the current cluster number to AX.
        pop ax

; Right-shift the current cluster number in EAX by the shift count to get the
; sector number of the FAT sector holding the next cluster number, relative to
; the FAT data region's sector number.
; `7` was modified to the actual shift count
; log(2, NumberOfClusterNumbersPerFATSector).
        shr eax, 7          ; e.g. 9-2 for 512 by/sect.
fat_afterss:    ; selfmodifying code: previous byte is patched!
        ; (to hold the fat_secshift value)

; Add the FAT data region's sector number to EAX.
; Now EAX stores the sector number of the FAT sector holding the next cluster
; number.
        add eax, [fat_start]    ; absolute sector number now

; Put the FAT buffer's segment to BX.
        mov bx, FATSEG
; Put the FAT buffer's segment to ES.
        mov es, bx
; Put 0 to BX.
; Now ES:BX points to the FAT buffer.
        sub bx, bx

; Compare the sector number in EAX with the sector number of the sector last
; read.
        cmp eax, [fat_sector]   ; already buffered?
; If equal, jump to `cn_buffered`.
        jz  cn_buffered
; Put the sector number of the FAT sector holding the next cluster number in
; EAX to [fat_sector].
        mov [fat_sector],eax    ; number of buffered sector
; Read the FAT sector holding the next cluster number.
        call    readDisk

; Mask off the highest 4 bits of the next cluster number, according to FAT
; specification.
cn_buffered:    and byte [es:di+3],0x0f ; mask out top 4 bits
; Put the next cluster number to EAX.
        mov eax, [es:di]        ; read next cluster number

; Pop old BX.
        pop bx
; Pop old DI.
        pop     di
; Pop old ES.
        pop es
; Return.
        ret


;-----------------------------------------------------------------------

; Convert cluster number to the absolute sector number
; ... or return carry if EndOfChain! Needs data_start.
; input:    EAX - target cluster
; output:   EAX - absolute sector
;       EDX - [bsSectPerClust] (byte)
;       carry clear
;       (if carry set, EAX/EDX unchanged, end of chain)

convert_cluster:
; Compare the cluster number in EAX with 0x0FFFFFF8.
; 0x0FFFFFF8 means end-of-chain.
        cmp eax, 0x0ffffff8 ; if end of cluster chain...
; If >= 0x0FFFFFF8, jump to `end_of_chain`.
        jnb end_of_chain

; Subtract EAX by 2 to get the 0-based cluster number.
        ; sector = (cluster-2) * clustersize + data_start
        dec eax
        dec eax

; Put the number of sectors per cluster to EDX.
        movzx   edx, byte [bsSecPerClust]
; Push the number of sectors per cluster in EDX.
        push    edx
; Multiply the 0-based cluster number in EAX by the number of sectors per
; cluster in EDX to get the sector number, relative to the FAT data region's
; sector number.
; EDX:EAX = EAX * EDX.
        mul edx
; Pop the number of sectors per cluster to EDX.
        pop edx
; Add the FAT data region's sector number to the sector number in EAX to get
; the absolute sector number.
        add eax, [data_start]
        ; here, carry is unset (unless parameters are wrong)
; Return.
        ret

; Put 1 to CF to indicate end-of-chain.
end_of_chain:   stc         ; indicate EOC by carry
; Return.
        ret

;-----------------------------------------------------------------------

; PRINT - prints string DS:SI
; modifies AX BX SI

; Put 0 to BX.
; BH is page number.
; BL is color.
printchar:  xor bx, bx      ; video page 0
; Put 0x0E to AH.
; 0x0E means TTY mode for interrupt 0x10 video service.
        mov ah, 0x0e    ; print it
; Invoke interrupt 0x10 video service to print the character in AL.
        int 0x10        ; via TTY mode
; Put the character in [DS:SI] to AL.
; SI is incremented.
; Now SI points to one byte after the character.
print:      lodsb           ; get token
; Test whether the character in AL is value 0.
        cmp al, 0       ; end of string?
; If the character in AL is not value 0, jump to `printchar`.
        jne printchar   ; until done
; If the character in AL is value 0, return.
        ret         ; return to caller

;-----------------------------------------------------------------------

; Read a sector from disk, using LBA
; input:    EAX - 32-bit DOS sector number
;       ES:BX - destination buffer
;       (will be filled with 1 sector of data)
; output:   ES:BX points one byte after the last byte read.
;       EAX - next sector

; Push DX.
readDisk:   push    dx
; Push SI.
        push    si
; Push DI.
        push    di

; Push the sector number in EAX.
read_next:  push    eax ; would ax be enough?
; Put SP to DI.
        mov di, sp  ; remember parameter block end

;---        db  0x66    ; operand size override (push dword)
; Put 0 to the higher 8 bits of the 48-bit address.
        push    byte 0  ;XXX    ; other half of the 32 bits at [C]
                ; (did not trust "o32 push byte 0" opcode)
; Put 0 to the second higher 8 bits of the 48-bit address.
        push    byte 0  ; [C] sector number high 32bit
; Put the sector number in EAX to the lower 32 bits of the 48-bit address.
        push    eax ; [8] sector number low 32bit
; Specify the read buffer's segment.
        push    es  ; [6] buffer segment
; Specify the read buffer's offset.
        push    bx  ; [4] buffer offset
; Specify the number of sectors to read.
        push    byte 1  ; [2] 1 sector (word)
; Put the size of the LBA packet.
        push    byte 16 ; [0] size of parameter block (word)
; Point SI to the LBA packet in stack.
        mov si, sp
; Put the drive number to DL, as required by interrupt 0x13 AH=0x42 service.
        mov dl, [drive]
; Specify to use interrupt 0x13 AH=0x42 service.
        mov ah, 42h ; disk read
; Invoke interrupt 0x13 AH=0x42 service to read disk using LBA addressing.
; If have error, CF becomes 1.
        int 0x13

; Put DI to SP.
        mov sp, di  ; remove parameter block from stack
                ; (without changing flags!)
; Pop the sector number to EAX.
        pop eax ; would ax be enough?

; If not have error, jump to `read_ok`.
        jnc read_ok     ; jump if no error

; Push AX.
        push    ax          ; !!
; Put 0 to AH.
        xor ah, ah      ; else, reset and retry
; Invoke interrupt 0x13 AH=0 service to reset the disk.
        int 0x13
; Pop old AX.
        pop ax          ; !!
; Jump to `read_next`.
        jmp read_next

; Increment the sector number in EAX.
read_ok:    inc     eax         ; next sector

; Increment BX by the number of bytes per sector.
; Now ES:BX points to the unfilled part of the read buffer.
; If overflow, CF becomes 1.
        add bx, word [bsBytesPerSec]
; If overflow, jump to `no_incr_es`.
        jnc no_incr_es      ; if overflow...

; If not overflow.
; Put ES to DX.
        mov dx, es
; Add 0x1000 to DX, which means pointing ES to the next 0x10000 bytes segment.
; Notice BX overflows around and BX can address 0x10000 bytes (64KB).
        add dh, 0x10        ; ...add 1000h to ES
; Put DX to ES.
        mov es, dx

; Pop old DI.
no_incr_es: pop di
; Pop old SI.
        pop     si
; Pop old DX.
        pop dx
; Return.
        ret

;-----------------------------------------------------------------------

; Message.
msg_LoadFreeDOS db "Loading FreeDOS ",0

; Allocate zeros up to $$:0x01EE exclusive.
; 0x01EE + 18 = 512.
; The remaining 18 bytes below make the boot sector exactly 512 bytes.
       times 0x01ee-$+$$ db 0

; Error message.
msg_BootError   db "No "
        ; currently, only "kernel.sys not found" gives a message,
        ; but read errors in data or root or fat sectors do not.

; Kernel file name.
filename    db "KERNEL  SYS"

; Two bytes of 0.
; Mark the boot sector as bootable.
sign        dw 0, 0xAA55
        ; Win9x uses all 4 bytes as magic value here.

```

## oemboot.asm
[boot/oemboot.asm](https://github.com/FDOS/kernel/blob/9d5abfe25aeff1bdbe325d49bc2dcae493a351bb/boot/oemboot.asm).
```
;
; File:
;                          oemboot.asm
;                      2004, Kenneth J. Davis
;                Copyright (c) 200?, <add name here>
; Description:
; OEM boot sector for FreeDOS compatible with IBM's (R) PC-DOS,
; and Microsoft's (R) MS-DOS.  It may work with older OpenDOS/DR-DOS,
; although the standard FreeDOS boot sector is needed with ver 7+
; releases.  May work with other versions of DOS that use
; IBMBIO.COM/IBMDOS.COM pair.  This boot sector loads only up
; to 58 sectors (29KB) of the kernel (IBMBIO.COM) to 0x70:0 then
; jumps to it.  As best I can tell, PC-DOS (and MS-DOS up to version
; 6.xx behaves similar) expects on entry for:
; ch = media id byte in the boot sector
; dl = BIOS drive booted from (0x00=A:, 0x80=C:, ...)
; ax:bx = the starting (LBA) sector of cluster 2 (ie the 1st
; data sector, which is 0x0000:0021 for FAT12)
; ?note? IBMBIO.COM/IO.SYS may use ax:bx and cluster # stored
; elsewhere (perhaps dir entry still at 0x50:0) to determine
; starting sector for full loading of kernel file.
; it also expects the boot sector (in particular the BPB)
; to still be at 0x0:7C00, the directory entry for IBMBIO.COM
; (generally first entry of first sector of the root directory)
; at 0x50:0 (DOS Data Area).  The original boot sector may update
; the floppy disk parameter table (int 1Eh), but we don't so
; may fail for any systems where the changes (???) are needed.
; If the above conditions are not met, then IBMBIO.COM will
; print the not a bootable disk error message.
;
; For MS-DOS >= 7 (ie Win9x DOS) the following conditions
; must be met:
; bp = 0x7C00, ie offset boot sector loaded at
; [bp-4] = the starting (LBA) sector of cluster 2 (ie the 1st
; data sector [this is the same as ax:bx for earlier versions
; and dx:ax in Win9x boot sector]
; The starting cluster of the kernel file is stored in
; di for FAT 12/16 (where si is a don't care) and si:di
; for FAT 32.
; The values for ax,bx,cx,dx,ds and the stack do not
; seem to be important (used by IO.SYS) and so may be any value
; (though dx:ax=[data_start], cx=0, bx=0x0f00 on FAT12 or
; 0x0700 on FAT32, ds=0, ss:sp=0:7b??)

; the boot time stack may store the original int1E floppy
; parameter table, otherwise nothing else important seems
; stored there and I am unsure if even this value is used
; beyond boot sector code.

;
; This boot sector only supports FAT12/FAT16 as PC-DOS
; does not support FAT32 and newer FAT32 capable DOSes
; probably have different boot requirements; also do NOT
; use it to boot the FreeDOS kernel as it expects to be
; fully loaded by boot sector (> 29KB & usually to 0x60:0).
;
; WARNING: PC-DOS has additional requirements, in particular,
; it may expect that IBMBIO.COM and IBMDOS.COM be the 1st
; two entries in the root directory (even before the label)
; and that they occupy the 1st consecutive data sectors.
; Newer releases may support other positions, but still
; generally should occupy consecutive sectors. These conditions
; can usually be met by running sys on a freshly formatted
; and un-label'd disk.
;
;
; Derived From:
;                            boot.asm
;                           DOS-C boot
;
;                   Copyright (c) 1997, 2000-2004
;               Svante Frey, Jim Hall, Jim Tabor, Bart Oldeman,
;             Tom Ehlert, Eric Auer, Luchezar Georgiev, Jon Gentle
;             and Michal H. Tyc (DR-DOS adaptation, boot26dr.asm)
;                      All Rights Reserved
;
; This file is part of FreeDOS.
;
; DOS-C is free software; you can redistribute it and/or
; modify it under the terms of the GNU General Public License
; as published by the Free Software Foundation; either version
; 2, or (at your option) any later version.
;
; DOS-C is distributed in the hope that it will be useful, but
; WITHOUT ANY WARRANTY; without even the implied warranty of
; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See
; the GNU General Public License for more details.
;
; You should have received a copy of the GNU General Public
; License along with DOS-C; see the file COPYING.  If not,
; write to the Free Software Foundation, 675 Mass Ave,
; Cambridge, MA 02139, USA.
;
;
;   +--------+
;   | CLUSTER|
;   |  LIST  |
;   |--------| 0000:7F00
;   |LBA PKT |
;   |--------| 0000:7E00  (0:BP+200)
;   |BOOT SEC| contains BPB
;   |ORIGIN  |
;   |--------| 0000:7C00  (0:BP)
;   |VARS    | only known is 1st data sector (start of cluster 2)
;   |--------| 0000:7BFC  (DS:[BP-4])
;   |STACK   | minimal 256 bytes (1/2 sector)
;   |- - - - |
;   |KERNEL  | kernel loaded here (max 58 sectors, 29KB)
;   |LOADED  | also used as FAT buffer
;   |--------| 0070:0000 (0:0700)
;   |DOS DA/ | DOS Data Area,
;   |ROOT DIR| during boot contains directory entries
;   |--------| 0000:0500
;   |BDA     | BIOS Data Area
;   +--------+ 0000:0400
;   |IVT     | Interrupt Vector Table
;   +--------+ 0000:0000

CPU 8086  ; enable assembler warnings to limit instruction set

;%define ISFAT12         1              ; only 1 of these should be set,
;%define ISFAT16         1              ; defines which FAT is supported

%define TRYLBAREAD       1              ; undefine to use only CHS int 13h
%define SETROOTDIR       1              ; if defined dir entry copied to 0:500
%define LOOPONERR        1              ; if defined on error simply loop forever
;%define RETRYALWAYS     1              ; if defined retries read forever
;%define WINBOOT         1              ; use win9x kernel calling conventions (name & jmp addr)
;%define MSCOMPAT        1              ; sets default filename to MSDOS IO.SYS

%ifdef WINBOOT                          ; if set also change from PC-DOS to
%ifndef MSCOMPAT                        ; kernel name to MS-DOS kernel name
%define MSCOMPAT
%endif
%endif

; Set segment type.
segment .text

; The offset base.
%define BASE            0x7c00          ; boot sector originally at 0x0:BASE
; The user read buffer's segment.
%define LOADSEG         0x0070          ; segment to load kernel at LOADSEG:0
; The user read buffer's end segment.
%define LOADEND         0x07b0          ; limit reads to below this segment
                                        ; LOADSEG+29KB, else data overwritten

; The FAT buffer's offset.
%define FATBUF          bp-0x7500       ; offset of temporary buffer for FAT
                                        ; chain 0:FATBUF = 0:0700 = LOADSEG:0
; The root directory buffer's offset.
%define ROOTDIR         bp-0x7700       ; offset to buffer for root directory
                                        ; entry of kernel 0:ROOTDIR
; The cluster list buffer's offset.
%define CLUSTLIST       bp+0x0300       ; zero terminated list of clusters
                                        ; that the kernel occupies

;       Some extra variables
; using bp-Entry+variable_name generates smaller code than using just
; variable_name, where bp is initialized to Entry, so bp-Entry equals 0

; The offset of the LBA packet used by interrupt 0x13.
%define LBA_PACKET      bp+0x0200            ; immediately after boot sector
; The offset of the field that stores the LBA packet's size.
%define LBA_SIZE        word [LBA_PACKET]    ; size of packet, should be 10h
; The offset of the field that stores the number of sectors to read.
%define LBA_SECNUM      word [LBA_PACKET+2]  ; number of sectors to read
; The offset of the field that stores the read buffer's offset.
%define LBA_OFF         LBA_PACKET+4         ; buffer to read/write to
; The offset of the field that stores the read buffer's segment.
%define LBA_SEG         LBA_PACKET+6
; The offset of the field that stores the 48-bit LBA sector number.
%define LBA_SECTOR_0    word [LBA_PACKET+8 ] ; LBA starting sector #
%define LBA_SECTOR_16   word [LBA_PACKET+10]
%define LBA_SECTOR_32   word [LBA_PACKET+12]
%define LBA_SECTOR_48   word [LBA_PACKET+14]

; The offset of the space after the LBA packet.
%define PARAMS LBA_PACKET+0x10
;%define RootDirSecs      PARAMS+0x0        ; # of sectors root dir uses
; The offset of the variable storing the first FAT's sector number.
%define fat_start        PARAMS+0x2         ; first FAT sector
;%define root_dir_start   PARAMS+0x6        ; first root directory sector
; The offset of the variable storing the kernel file's first cluster number.
%define first_cluster    PARAMS+0x0a        ; starting cluster of kernel file
; The offset of the variable storing the FAT data region's sector number.
%define data_start       bp-4               ; first data sector (win9x expects here)

;-----------------------------------------------------------------------


; Let offset base be 0x7C00.
                org     BASE

; The boot sector's entry point.
; Jump to `real_start`.
Entry:          jmp     short real_start
; NOP instruction for the third byte, as required by FAT specification.
                nop

; The `jmp` and `nop` above take 3 bytes, followed by FAT info variables.
; These variables are initialized when running `SYS.COM` to install the boot
; sector.
;
; The offsets of the FAT info variables:
;       bp is initialized to 7c00h
%define bsOemName       bp+0x03      ; OEM label
%define bsBytesPerSec   bp+0x0b      ; bytes/sector
%define bsSecPerClust   bp+0x0d      ; sectors/allocation unit
%define bsResSectors    bp+0x0e      ; # reserved sectors
%define bsFATs          bp+0x10      ; # of fats
%define bsRootDirEnts   bp+0x11      ; # of root dir entries
%define bsSectors       bp+0x13      ; # sectors total in image
%define bsMedia         bp+0x15      ; media descrip: fd=2side9sec, etc...
%define sectPerFat      bp+0x16      ; # sectors in a fat
%define sectPerTrack    bp+0x18      ; # sectors/track
%define nHeads          bp+0x1a      ; # heads
%define nHidden         bp+0x1c      ; # hidden sectors
%define nSectorHuge     bp+0x20      ; # sectors if > 65536
%define drive           bp+0x24      ; drive number
%define extBoot         bp+0x26      ; extended boot signature
%define volid           bp+0x27
%define vollabel        bp+0x2b
%define filesys         bp+0x36


;-----------------------------------------------------------------------

;               times   0x3E-$+$$ db 0
;
;       Instead of zero-fill,
;       initialize BPB with values suitable for a 1440 K floppy
;
                db 'IBM  5.0'   ; OEM label
                dw 512          ; bytes per sector
                db 1            ; sectors per cluster
                dw 1            ; reserved sectors
                db 2            ; number of FATs
                dw 224          ; root directory entries
                dw 80 * 36      ; total sectors on disk
                db 0xF0         ; media descriptor
                dw 9            ; sectors per 1 FAT copy
                dw 18           ; sectors per track
                dw 2            ; number of heads
                dd 0            ; hidden sectors
                dd 0            ; big total sectors
                db 0            ; boot unit
                db 0            ; reserved
                db 0x29         ; extended boot record id
                dd 0x12345678   ; volume serial number
                db 'NO NAME    '; volume label
                db 'FAT12   '   ; filesystem id

;-----------------------------------------------------------------------
;   ENTRY
;-----------------------------------------------------------------------

real_start:
; Put 0 to IF to disable maskable interrupts.
                cli             ; disable interrupts until stack ready
; Put 0 to DF. When DF is 0, string operations increment SI and DI.
                cld             ; all string operations increment
; Put 0 to AX.
                xor     ax, ax  ; ensure our segment registers ready
; Put 0 to DS.
                mov     ds, ax  ; cs=ds=es=ss=0x0000
; Put 0 to ES.
                mov     es, ax
; Put 0 to SS.
                mov     ss, ax
; Put 0x7C00 to BP.
                mov     bp, BASE
; Put 0x7BFC (4B before 0x0000:0x7C00) to SP.
                lea     sp, [bp-4] ; for DOS <7 this may be [bp]

;       For compatibility, diskette parameter vector updated.
;               lea     di  [bp+0x3E] ; use 7c3e([bp+3e]) for PC-DOS,
;               ;lea     di  [bp]     ; but 7c00([bp]) for DR-DOS 7 bug
;               mov     bx, 4 * 1eh   ; stored at int 1E's vector
;               lds     si, [bx]      ; fetch current int 1eh pointer
;               push    ds            ; store original 1eh pointer at stack top
;               push    si            ; so can restore later if needed
;
;       Copy table to new location
;               mov     cl, 11        ; the parameter table is 11 bytes
;               rep     movsb         ; and copy the parameter block
;               mov     ds, ax        ; restore DS
;
;       Note: make desired changes to table here
;
;       Update int1E to new location
;               mov     [bx+2], 0     ; set to 0:bp or 0:bp+3e as appropriate
;               mov     word [bx], 0x7c3e ; (use 0x7c00 for DR-DOS)

; Put 1 to IF to enable maskable interrupts.
                sti             ; enable interrupts

;       If updated floppy parameter table then must notify BIOS
;       Otherwise a reset should not be needed here.
;               int     0x13    ; reset drive (AX=0)

;
; Note: some BIOS implementations may not correctly pass drive number
; in DL, however we work around this in SYS.COM by NOP'ing out the use of DL
; (formerly we checked for [drive]==0xff; update sys.c if code moves)
;
; Put the drive number in DL to [drive].
; DL was set by BIOS before loading the boot sector.
; DL = 00h: 1st floppy disk.
; DL = 01h: 2nd floppy disk.
; DL = 80h: 1st hard disk.
; DL = 81h: 2nd hard disk.
; DL = e0h: 1st CD.
                mov     [drive], dl        ; rely on BIOS drive number in DL


;       GETDRIVEPARMS:  Calculate start of some disk areas.
;
; Put lower 2 bytes of the number of hidden sectors to SI.
                mov     si, word [nHidden]
; Put higher 2 bytes of the number of hidden sectors to DI.
; Now DI:SI stores the number of hidden sectors.
                mov     di, word [nHidden+2]
; Add the number of reserved sectors to SI.
; If overflow, CF becomes 1.
                add     si, word [bsResSectors]
; Add CF to DI.
; Now DI:SI stores the number of hidden and reserved sectors, which is also the
; first FAT's sector number.
                adc     di, byte 0              ; DI:SI = first FAT sector

; Put lower 2 bytes of the first FAT's sector number to `[fat_start]`.
                mov     word [fat_start], si
; Put higher 2 bytes of the first FAT's sector number to `[fat_start+2]`.
                mov     word [fat_start+2], di

; Put the number of FATs to AL.
                mov     al, [bsFATs]
; Extend AL to AX.
; Now AX stores the number of FATs.
                cbw
; Multiply the number of FATs by the number of sectors per FAT.
; DX:AX = AX * [sectPerFat].
; Now DX:AX stores the number of FAT sectors.
                mul     word [sectPerFat]       ; DX:AX = total number of FAT sectors

; Add the number of FAT sectors to the number of hidden and reserved sectors.
; Now DI:SI stores the FAT root directory's sector number.
                add     si, ax
                adc     di, dx                  ; DI:SI = first root directory sector
; Push lower 2 bytes of the FAT root directory's sector number in DI.
                push di                         ; mov word [root_dir_start+2], di
; Push higher 2 bytes of the FAT root directory's sector number in SI.
                push si                         ; mov word [root_dir_start], si

                ; Calculate how many sectors the root directory occupies.
; Put the number of bytes per sector to BX.
                mov     bx, [bsBytesPerSec]
; Put 5 to CL, to be used as shfit count below.
                mov     cl, 5                   ; divide BX by 32
; Divide the number of bytes per sector by the number of bytes per directory
; entry.
; Now BX stores the number of directory entries per sector.
                shr     bx, cl                  ; BX = directory entries per sector

; Put the number of directory entries of the FAT root directory to AX.
                mov     ax, [bsRootDirEnts]
; Put 0 to DX.
                xor     dx, dx
; Divide the number of directory entries of the FAT root directory by the
; number of directory entries per sector.
; DX(remainder):AX(quotient) = DX:AX / BX.
; Now AX stores the number of sectors of the FAT root directory.
                div     bx                      ; set AX = sectors per root directory
; Push the number of sectors of the FAT root directory in AX.
                push    ax                      ; mov word [RootDirSecs], ax

; Add the number of sectors of the FAT root directory to the FAT root
; directory's sector number.
; If overflow, CF becomes 1.
                add     si, ax
; Add CF to DI.
; Now DI:SI stores the FAT data region's sector number.
                adc     di, byte 0              ; DI:SI = first data sector

; Put lower 2 bytes of the FAT data region's sector number to `[data_start]`.
                mov     [data_start], si
; Put higher 2 bytes of the FAT data region's sector number to
; `[data_start+2]`.
                mov     [data_start+2], di


;       FINDFILE: Searches for the file in the root directory.
;
;       Returns:
;                               AX = first cluster of file

                ; First, read the root directory into buffer.
                ; into the temporary buffer. (max 29KB or overruns stuff)

; Pop the number of sectors of the FAT root directory to DI.
; DI specifies the number of sectors to read for `readDisk` below.
                pop     di              ; mov di, word [RootDirSecs]
; Pop higher 2 bytes of the FAT root directory's sector number to AX.
                pop     ax              ; mov ax, word [root_dir_start]
; Pop lower 2 bytes of the FAT root directory's sector number to DX.
; DX:AX specifies the starting sector number for `readDisk` below.
                pop     dx              ; mov dx, word [root_dir_start+2]
; Put the root directory buffer's offset to BX.
; ES:BX specifies the destination buffer for `readDisk` below.
                lea     bx, [ROOTDIR]   ; es:bx = 0:0500
; Push ES.
                push    es              ; save pointer to ROOTDIR
; Read the sectors of the FAT root directory to the root directory buffer.
                call    readDisk
; Pop old ES.
                pop     es              ; restore pointer to ROOTDIR
; Put the root directory buffer's offset to SI.
                lea     si, [ROOTDIR]   ; ds:si = 0:0500


        ; Search for kernel file name, and find start cluster.

; Put 11 to CX, to be used as repeat times below.
; 11 means 8+3 style file name.
next_entry:     mov     cx, 11
; Point DI to the kernel file name.
                mov     di, filename
; Push the current directory entry's offset to SI.
                push    si
; Compare byte [DS:SI] with byte [ES:DI], repeat at most 11 times.
; Each time SI and DI are incremented by 1.
; If all 11 characters are equal, ZF becomes 1.
                repe    cmpsb
; Pop the current directory entry's offset to SI.
                pop     si
; Put the directory entry's first cluster number to AX.
; A directory entry's byte 0x1A stores its first cluster number.
                mov     ax, [si+0x1A]; get cluster number from directory entry
; If the kernel file name is found, jump to `ffDone`.
                je      ffDone

; Increment SI by 32 to point to the next directory entry.
; If overflow, CF becomes 1.
                add     si, byte 0x20   ; go to next directory entry
; If overflow, jump to `boot_error`.
                jc      boot_error      ; fail if not found and si wraps
; Test whether the first byte of the file name is 0, which means end-of-entry.
                cmp     byte [si], 0    ; if the first byte of the name is 0,
; If it is not end-of-entry, jump to `next_entry`.
                jnz     next_entry      ; there are no more files in the directory

ffDone:
; Put the kernel file's first cluster number in AX to [first_cluster].
                mov [first_cluster], ax ; store first cluster number

%ifdef SETROOTDIR
                ; copy over this portion of root dir to 0x0:500 for PC-DOS
                ; (this may allow IBMBIO.COM to start in any directory entry)
; Put the root directory buffer's offset to DI.
                lea     di, [ROOTDIR]   ; es:di = 0:0500
; Put 32 to CX, to be used as repeat times below.
                mov     cx, 32          ; limit to this 1 entry (rest don't matter)
; Copy 2 bytes from [DS:SI] to [ES:DI], repeat 32 times.
; Each time SI and DI are incremented by 2, CX is decremented by 1.
                rep     movsw
%endif

;       GETFATCHAIN:
;
;       Reads the FAT chain and stores it in a temporary buffer in the first
;       64 kb.  The FAT chain is stored an array of 16-bit cluster numbers,
;       ending with 0.
;
;       The file must fit in conventional memory, so it can't be larger than
;       640 kb. The sector size must be at least 512 bytes, so the FAT chain
;       can't be larger than 2.5 KB (655360 / 512 * 2 = 2560).
;
;       Call with:      AX = first cluster in chain

                ; Load the complete FAT into memory. The FAT can't be larger
                ; than 128 kb
; Put the FAT buffer's offset to BX.
                lea     bx, [FATBUF]            ; es:bx = 0:0700
; Put the number of sectors per FAT to DI.
; DI specifies the number of sectors to read for `readDisk` below.
                mov     di, [sectPerFat]
; Put lower 2 bytes of the first FAT's sector number to AX.
                mov     ax, word [fat_start]
; Put higer 2 bytes of the first FAT's sector number to DX.
; DX:AX specifies the starting sector number for `readDisk` below.
                mov     dx, word [fat_start+2]
; Read the first FAT's sectors to the FAT buffer.
                call    readDisk

                ; Set ES:DI to the temporary storage for the FAT chain.
; Put DS to ES.
                push    ds
                pop     es
; Put the cluster list buffer's offset to DI.
                lea     di, [CLUSTLIST]
                ; Set DS:0 to FAT data we loaded
; Put the user read buffer's segment to AX.
                mov     ax, LOADSEG
; Put the user read buffer's segment to DS.
                mov     ds, ax                  ; ds:0 = 0x70:0 = 0:FATBUF

; Put the kernel file's first cluster number to AX.
                mov ax, [first_cluster]         ; restore first cluster number
; Push the user read buffer's segment in DS.
                push    ds                      ; store LOADSEG

; Put the current cluster number in AX to [ES:DI] in the cluster list buffer.
next_clust:     stosw                           ; store cluster number
; Put the current cluster number in AX to SI.
                mov     si, ax                  ; SI = cluster number

%ifdef ISFAT12
                ; This is a FAT-12 disk.

; Each 12-bit cluster number is stored across 2 bytes.
; The bits layout of 2 consective cluster numbers (12 bits * 2 = 24 bits) in 3
; bytes is:
; 0 76543210
; 1 3210BA98
; 2 BA987654

; Multiply the current cluster number by 3.
fat_12:         add     si, si          ; multiply cluster number by 3...
                add     si, ax
; Divide the current cluster number by 2 to get the offset of the 2 bytes
; storing the next cluster number.
; If the current cluster number is odd, CF becomes 1.
                shr     si, 1           ; ...and divide by 2
; Put the 2 bytes storing the next cluster number in [DS:SI] to AX.
                lodsw

                ; If the cluster number was even, the cluster value is now in
                ; bits 0-11 of AX. If the cluster number was odd, the cluster
                ; value is in bits 4-15, and must be shifted right 4 bits. If
                ; the number was odd, CF was set in the last shift instruction.

; If CF is 0 which means the current cluster number is even, jump to
; `fat_even`.
                jnc     fat_even
; If CF is 1 which means the current cluster number is odd.
; Put 4 in CL, to be used as shift count below.
                mov     cl, 4
; Shift off the lower 4 bits.
                shr     ax, cl

; Mask off the higher 4 bits.
; Now AX stores the new current cluster number.
fat_even:       and     ah, 0x0f        ; mask off the highest 4 bits
; Test whether the new current cluster number is EOF.
                cmp     ax, 0x0ff8      ; check for EOF
; If the new current cluster number is not EOF, jump to `next_clust`.
                jb      next_clust      ; continue if not EOF

%endif
%ifdef ISFAT16
                ; This is a FAT-16 disk. The maximal size of a 16-bit FAT
                ; is 128 kb, so it may not fit within a single 64 kb segment.

; Put the user read buffer's segment to DX.
fat_16:         mov     dx, LOADSEG
; Multiply the current cluster number by 2 to get the offset of the 2 bytes
; storing the next cluster number.
; If overflow, CF becomes 1.
                add     si, si          ; multiply cluster number by two
; If not overflow, jump to `first_half`.
                jnc     first_half      ; if overflow...
; If overflow, add 0x1000 to DX, which points DX to the next 0x10000 bytes
; segment. Notice SI overflows around and SI can address 0x10000 bytes (64KB).
                add     dh, 0x10        ; ...add 64 kb to segment value

; Put the user read buffer's segment to DS.
; Now DS:SI points to the next cluster number.
first_half:     mov     ds, dx          ; DS:SI = pointer to next cluster
; Put the next cluster number in [DS:SI] to AX.
; Now AX stores the new current cluster number.
                lodsw                   ; AX = next cluster

; Test whether the new current cluster number is EOF.
                cmp     ax, 0xfff8      ; >= FFF8 = 16-bit EOF
; If the new current cluster number is not EOF, jump to `next_clust`.
                jb      next_clust      ; continue if not EOF
%endif

finished:       ; Mark end of FAT chain with 0, so we have a single
                ; EOF marker for both FAT-12 and FAT-16 systems.

; Put 0 to AX.
                xor     ax, ax
; Put 0 in AX to [ES:DI] in the cluster list buffer to mark the end.
                stosw

; Put the cluster list buffer's segment in CS to DS.
                push    cs
                pop     ds


;       loadFile: Loads the file into memory, one cluster at a time.

; Pop old ES.
                pop     es              ; set ES:BX to load address 70:0
; Put 0 to BX.
                xor     bx, bx

; Put the cluster list buffer's offset to SI.
                lea     si, [CLUSTLIST] ; set DS:SI to the FAT chain

; Put the cluster number [DS:SI] in the cluster list buffer to AX.
cluster_next:   lodsw                   ; AX = next cluster to read
; Test whether the cluster number is 0 which means EOF.
                or      ax, ax          ; EOF?
; If the cluster number is not EOF, jump to `load_next`.
                jne     load_next       ; no, continue

                                        ; dl set to drive by readDisk
; Put [bsMedia] to CH.
                mov ch, [bsMedia]       ; ch set to media id
; Put higher 2 bytes of the FAT data region's sector number to AX.
                mov ax, [data_start+2]  ; ax:bx set to 1st data sector
; Put lower 2 bytes of the FAT data region's sector number to BX.
                mov bx, [data_start]    ;
; Put the kernel file's first cluster number to DI.
                mov di, [first_cluster] ; set di (si:di on FAT32) to starting cluster #
%ifdef WINBOOT
; Jump to run the loaded kernel.
                jmp     LOADSEG:0x0200  ; yes, pass control to kernel
%else
; Jump to run the loaded kernel.
                jmp     LOADSEG:0000    ; yes, pass control to kernel
%endif


; failed to boot
boot_error:
; Print the following error message.
call            show
;               db      "Error! Hit a key to reboot."
; Error message.
                db      "):."
%ifdef LOOPONERR
; Jump to self.
jmp $
%else

                ; Note: should restore floppy paramater table address at int 0x1E
; Put 0 to AH.
                xor     ah,ah
; Invoke interrupt 0x13 AH=0 service to reset the disk.
                int     0x13                    ; reset floppy
; Invoke interrupt 0x16 AH=0 service to wait for a key press.
                int     0x16                    ; wait for a key
; Invoke interrupt 0x19 AH=0 service to reboot.
                int     0x19                    ; reboot the machine
%endif


; Decrease the cluster number by 2 to get the 0-based sector number.
load_next:      dec     ax                      ; cluster numbers start with 2
                dec     ax

; Put the number of sectors per cluster to DI.
; The higher byte in DI is unused.
                mov     di, word [bsSecPerClust]
; Mask off the higher byte in DI.
; DI specifies the number of sectors to read for `readDisk` below.
                and     di, 0xff                ; DI = sectors per cluster
; Multiply the cluster number in AX by the number of sectors per cluster in DI
; to get the sector number, relative to the FAT data region's sector number.
; DX:AX = AX * DI.
; Now DX:AX stores the relative sector number.
                mul     di
; Add lower 2 bytes of the FAT data region's sector number to AX.
; If overflow, CF becomes 1.
                add     ax, [data_start]
; Add higher 2 bytes of the FAT data region's sector number and CF to AX.
; Now DX:AX stores the absolute sector number.
; DX:AX is specifies the starting sector number for `readDisk` below.
                adc     dx, [data_start+2]      ; DX:AX = first sector to read
; Read one cluster of the kernel file to the user read buffer.
                call    readDisk
; Jump to `cluster_next`.
                jmp     short cluster_next


; shows text after the call to this function.

; Pop the offset of next character to SI.
show:           pop     si
; Put the character in [DS:SI] to AL.
; SI is incremented.
; Now SI points to one byte after the character.
; If the character is `.`, it will be the last character to print, then SI
; points to the next instruction to return to.
                lodsb                           ; get character
; Push SI as the potential return address.
                push    si                      ; stack up potential return address
; Put 0x0E to AH.
; 0x0E means TTY mode for interrupt 0x10 video service.
                mov     ah,0x0E                 ; show character
; Invoke interrupt 0x10 video service to print the character in AL.
                int     0x10                    ; via "TTY" mode
; Test whether the character is `.`.
                cmp     al,'.'                  ; end of string?
; If the character is not `.`, jump to print the next character.
                jne     show                    ; until done
; If the character is `.`, return.
                ret


;       readDisk:       Reads a number of sectors into memory.
;
;       Call with:      DX:AX = 32-bit DOS sector number
;                       DI = number of sectors to read
;                       ES:BX = destination buffer
;
;       Returns:        CF set on error
;                       ES:BX points one byte after the last byte read.
;                       Exits early if LBA_SEG == LOADEND.

; Push SI.
readDisk:       push    si                      ; preserve cluster #

; Put the sector number to read to fields `LBA_SECTOR_0` and `LBA_SECTOR_16`.
                mov     LBA_SECTOR_0,ax
                mov     LBA_SECTOR_16,dx
; Put the destination buffer's segment to [LBA_SEG].
                mov     word [LBA_SEG], es
; Put the destination buffer's offset to [LBA_OFF].
                mov     word [LBA_OFF], bx

; Print the following message.
                call    show
; Message.
                db      "."
read_next:

; initialize constants
; Put 16 to be the LBA packet's size.
                mov     LBA_SIZE, 10h           ; LBA packet is 16 bytes
; Put 1 to be the number of sectors to read.
                mov     LBA_SECNUM,1            ; reset LBA count if error

; limit kernel loading to 29KB, preventing stack & boot sector being overwritten
; Compare the read buffer's segment to the user read buffer's end segment.
                cmp     word [LBA_SEG], LOADEND ; skip reading if past the end
; If equal, jump to `read_skip`.
                je      read_skip               ; of kernel file buffer

;******************** LBA_READ *******************************

                        ; check for LBA support

%ifdef TRYLBAREAD
; Specify to use interrupt 0x13 AH=0x41 service.
                mov     ah,041h                 ;
; Put 0x55AA to BX, as required by interrupt 0x13 AH=0x41 service.
                mov     bx,055aah               ;
; Put the drive number to DL, as required by interrupt 0x13 AH=0x41 service.
                mov     dl, [drive]             ; BIOS drive, 0=A:, 80=C:
; Test whether the drive number is 0 which means the first floppy disk.
                test    dl,dl                   ; don't use LBA addressing on A:
; If the drive number is 0, jump to `read_normal_BIOS`.
                jz      read_normal_BIOS        ; might be a (buggy)
                                                ; CDROM-BOOT floppy emulation
; Invoke interrupt 0x13 AH=0x41 service to check extensions present.
; If extensions are not present, CF is 1. If present, CX stores the flags:
; 1 – Device access using the LBA packet.
; 2 – Drive locking and ejecting.
; 4 – Enhanced disk drive support.
                int     0x13
; If extensions are not present, jump to `read_normal_BIOS`.
                jc  read_normal_BIOS

; Right-shift CX by 1 bit.
; Now CF stores the lower 1 bit shifted out.
                shr     cx,1                    ; CX must have 1 bit set

; Test whether CF is 1.
; BX = 0xAA55 - 1 + CF - BX = 0xAA54 + CF - 0xAA55 = CF - 1.
                sbb     bx,0aa55h - 1           ; tests for carry (from shr) too!
; If CF is not 1 which means LBA addressing is not supported, jump to
; `read_normal_BIOS`.
                jne     read_normal_BIOS
                                                ; OK, drive seems to support LBA addressing
; Put the address of the LBA packet to SI, as required by interrupt 0x13
; AH=0x42 service.
                lea     si,[LBA_PACKET]
                                                ; setup LBA disk block
; Put 0 to field `LBA_SECTOR_32`.
                mov     LBA_SECTOR_32,bx        ; bx is 0 if extended 13h mode supported
; Put 0 to field `LBA_SECTOR_48`.
                mov     LBA_SECTOR_48,bx


; Specify to use interrupt 0x13 AH=0x42 service.
                mov     ah,042h
; Jump to `do_int13_read`.
                jmp short    do_int13_read
%endif



read_normal_BIOS:

;******************** END OF LBA_READ ************************
; Code block below aims to convert the sector number to read into CHS numbers
; to be used by interrupt 0x13 AH=0x02 service.
;
; Put the sector number to read to DX:CX.
                mov     cx, LBA_SECTOR_0
                mov     dx, LBA_SECTOR_16

                ;
                ; translate sector number to BIOS parameters
                ;
                ;
                ; abs = sector                          offset in track
                ;     + head * sectPerTrack             offset in cylinder
                ;     + track * sectPerTrack * nHeads   offset in platter
                ;
; Put the number of sectors per track to AL.
                mov     al, [sectPerTrack]
; Multiply the number of sectors per track by the number of heads to get the
; number of sectors per cylinder.
; AX = AL * [nHeads].
                mul     byte [nHeads]
; Exchange AX and CX.
; Now CX stores the number of sectors per cylinder.
; Now DX:AX stores the sector number to read.
                xchg    ax, cx
                ; cx = nHeads * sectPerTrack <= 255*63
                ; dx:ax = abs
; Divide the sector number to read by the number of sectors per cylinder.
; DX(remainder):AX(quotient) = DX:AX / CX.
; NOW AX stores the cylinder number.
; NOW DX stores the in-cylinder sector offset.
                div     cx
                ; ax = track, dx = sector + head * sectPertrack
; Exchange AX and DX.
; NOW AX stores the in-cylinder sector offset.
; NOW DX stores the cylinder number.
                xchg    ax, dx
                ; dx = track, ax = sector + head * sectPertrack
; Divide the in-cylinder sector offset by the number of sectors per track.
; AH(remainder):AL(quotient) = AX / [sectPerTrack].
; Now AL stores the head number, AH stores the in-track sector number.
                div     byte [sectPerTrack]
                ; dx =  track, al = head, ah = sector
; Put the cylinder number to CX.
                mov     cx, dx
                ; cx =  track, al = head, ah = sector

                ; the following manipulations are necessary in order to
                ; properly place parameters into registers.
                ; ch = cylinder number low 8 bits
                ; cl = 7-6: cylinder high two bits
                ;      5-0: sector
; Put the head number to DH.
                mov     dh, al                  ; save head into dh for bios
; CX stores both the cylinder number (10 bits, possible values are 0 to 1023)
; and the sector number (6 bits, possible values are 1 to 63).
; Layout:
; CX:        ---CH--- ---CL---
; Cylinder : 76543210 98
; Sector   :            543210
;
; Put the lower 8 bits of the cylinder number to CH.
; Put the higher 2 bits of the cylinder number to CL's lower 2 bits.
                xchg    ch, cl                  ; set cyl no low 8 bits
; Right-rotate CL's lower 2 bits to higher 2 bits.
                ror     cl, 1                   ; move track high bits into
                ror     cl, 1                   ; bits 7-6 (assumes top = 0)
; Put the in-track sector number to CL's lower 6 bits.
                or      cl, ah                  ; merge sector into cylinder
; Increment the in-track sector number to make it 1-based.
                inc     cx                      ; make sector 1-based (1-63)

; Point ES:BX to `readDisk`'s read buffer.
; ES:BX specifies interrupt 0x13 AH=0x02 service's read buffer.
                les     bx,[LBA_OFF]
; Specify to use interrupt 0x13 AH=0x02 service.
; AH 0x02 service means read sectors from drive using CHS addressing.
; AL 0x01 means read 1 sector.
                mov     ax, 0x0201
do_int13_read:
; Put the drive number to DL.
                mov     dl, [drive]
; Invoke interrupt 0x13 AH=0x02 service to read disk using CHS addressing.
; If have error, CF becomes 1.
                int     0x13

read_finished:
%ifdef RETRYALWAYS
; If not have error, jump to `read_ok`.
                jnc     read_ok                 ; jump if no error
; Put 0 to AX.
                xor     ah, ah                  ; else, reset floppy
; Invoke interrupt 0x13 AH=0 service to reset the disk.
                int     0x13
read_next_chained:
; Jump to `read_next`.
                jmp     short read_next         ; read the same sector again
%else
; If have error, jump to `boot_error`.
                jc      boot_error              ; exit on error
%endif

read_ok:
; Put the number of bytes per sector to AX.
                mov     ax, word [bsBytesPerSec]
; Put 4 to CL, to be used as shift count below.
                mov     cl, 4                   ; adjust segment pointer by increasing
; Righit-shift the number of bytes per sector by 4 to get the number of
; segments per sector.
                shr     ax, cl
; Add the number of segments per sector to [LBA_SEG].
                add     word [LBA_SEG], ax      ; by paragraphs read in (per sector)

; Add 1 to the starting sector number in [LBA_SECTOR_0].
; If overflow, CF becomes 1.
                add     LBA_SECTOR_0,  byte 1
; Add CF to [LBA_SECTOR_16].
                adc     LBA_SECTOR_16, byte 0   ; DX:AX = next sector to read
; Decrement the number of sectors to read.
                dec     di                      ; if there is anything left to read,
%ifdef RETRYALWAYS
; If the number of sectors to read is not 0, jump to `read_next_chained`.
                jnz     read_next_chained       ; continue
%else
; If the number of sectors to read is not 0, jump to `read_next`.
                jnz     read_next               ; continue
%endif

read_skip:
; Put the read buffer's segment to ES.
                mov     es, word [LBA_SEG]      ; load adjusted segment value
                ; clear carry: unnecessary since adc clears it
; Pop old SI.
                pop     si
; Return.
                ret

; Allocate zeros up to $$:0x01F1 exclusive.
; 0x01F1 + 15 = 512.
; The remaining 15 bytes below make the boot sector exactly 512 bytes.
       times   0x01f1-$+$$ db 0
%ifdef MSCOMPAT
; Kernel file name.
filename        db      "IO      SYS"
%else
; Kernel file name.
filename        db      "IBMBIO  COM"
%endif
; Two bytes of 0.
                db      0,0

; Mark the boot sector as bootable.
sign            dw      0xAA55


```
