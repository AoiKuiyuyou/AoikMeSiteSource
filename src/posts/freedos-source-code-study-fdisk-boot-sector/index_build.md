--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: FreeDOS source code study - fdisk boot sector

author: Aoik

create_time: 2019-08-16 20:00:00

tags:
    - freedos-source-code-study
    - fdisk
    - boot-sector
    - 吸星大法强吃源码

post_id: 36

$template:
    file: root://src/posts/_base/post_page_base_no_highlight.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# FreeDOS source code study - fdisk boot sector

## BOOTNORM.ASM
[SOURCE/BOOTNORM/BOOTNORM.ASM](https://github.com/FDOS/fdisk/blob/769d52be0ac37d0cd1b1e140609b97ad8eeec592/SOURCE/BOOTNORM/BOOTNORM.ASM):
```
;
; normal DOS boot sector
;


segment _DATA           class=DATA align=2

; Global identifier of the start of the boot sector, which will be used in
; fdisk to read in the boot sector.
  global  _bootnormal_code
_bootnormal_code:

;-----------------------------------------------------------------------
;   ENTRY (copied from freedos bootsector)
;
; IN: DL = boot drive
;OUT: DL = boot drive
;
;-----------------------------------------------------------------------

; Put 0 to IF to disable maskable interrupts.
real_start:     cli
; Put 0 to DF. When DF is 0, string operations increment SI and DI.
                cld
; Put 0 to AX.
                xor     ax, ax
; Put 0 to SS.
                mov     ss, ax          ; initialize stack
; Put 0 to DS.
                mov     ds, ax
; Put 0x7C00 to BP.
                mov     bp, 0x7c00
; Put 0x7BE0 to SP.
                lea     sp, [bp-0x20]
; Put 1 to IF to enable maskable interrupts.
                sti
; Put 0x1FE0 to AX.
                mov     ax, 0x1FE0
; Put 0x1FE0 to ES.
                mov     es, ax
; Put 0x7C00 to SI.
                mov     si, bp
; Put 0x7C00 to DI.
                mov     di, bp
; Put 256 to CX, to be used as repeat count below.
                mov     cx, 0x0100
; Copy boot sector from [0x0000:0x07C0] to [0x1FE0:0x07C0].
; Each time copy 2 bytes. Repeat 256 times.
                rep     movsw
; Jump to `cont` in segment 0x1FE0.
                jmp     word 0x1FE0:0x7c00+ cont-real_start

; Put 0x1FE0 to DS.
cont:           mov     ds, ax
; Put 0x1FE0 to SS.
                mov     ss, ax
; Put 0 to AX.
                xor     ax,ax
; Put 0 to ES.
                mov     es,ax

;               call    print
;               db      "FreeDOS MBR...",0


                                         ; search for active partition
; Put [bp+446] to DI.
; It is the address of the first entry of partition table.
                lea di, [bp+0x1be] ; start of partition table
test_next_for_active:
; Test whether byte 446 is 0x80, which means it is an active partition.
                test byte [di],0x80
; If byte 446 is 0x80, jump to `active_partition_found`.
                jne  active_partition_found
; If byte 446 is not 0x80, increment DI by 16 to point to the next entry.
                add  di,0x10                    ; next table
; Test whether DI points to byte 510, which means end of partition table
; entries.
                cmp  di, 07c00h+0x1fe; scanned beyond end of table ??
; If DI not points to byte 510, jump to `test_next_for_active`.
                jb  test_next_for_active

;*****************************************************************
; If DI points to byte 510, print error message.
                call print
                db 'no active partition found',0

WAIT_FOR_REBOOT:
; Jump to self.
                jmp $


;*****************************************************************
trouble_reading_drive:
                call print
                db 'read error while reading drive',0
                jmp WAIT_FOR_REBOOT

;*****************************************************************

invalid_partition_code:
                call print
                db 'partition signature != 55AA',0

                jmp WAIT_FOR_REBOOT


;*****************************************************************

active_partition_found:
;               call print
;               db 'loading active partition',0

; Read the active partition's boot sector.
                call read_boot_sector
; If CF is 1 which means have error, jump to `trouble_reading_drive`.
                jc  trouble_reading_drive
; Test whether the last 2 bytes of the active partition's boot sector is
; 0xAA55.
                cmp word [es:0x7c00+0x1fe],0xaa55
; If the last 2 bytes of the active partition's boot sector is not 0xAA55,
; jump to `invalid_partition_code`.
                jne invalid_partition_code

;               call print
;               db '.jump DOS..',0
; Jump to the active partition's boot sector.
                jmp word 0x0:0x7c00             ; and jump to boot sector code


;*****************************
; read_boot_sector
;
; IN: DI--> partition info
;OUT:CARRY
;*****************************

read_boot_sector:
                ;  /* check for LBA support */
; Put 0x55AA to BX, as required by interrupt 0x13 AH=0x41 service.
        mov bx,0x55aa
; Specify to use interrupt 0x13 AH=0x41 service to check extensions present.
        mov ah,0x41
; Invoke interrupt 0x13 AH=0x41 service to check extensions present.
; If extensions are not present, CF is 1. If present, CX stores the bitmask:
; 1 – Device access using the LBA packet.
; 2 – Drive locking and ejecting.
; 4 – Enhanced disk drive support.
        int 0x13
; If CF is 1 which means extensions are not present, jump to `StandardBios`.
        jc  StandardBios    ;  if (regs.b.x != 0xaa55 || (regs.flags & 0x01))
; Test whether BX is 0xAA55.
        cmp bx,0xaa55       ;    goto StandardBios;
; If BX is not 0xAA55, jump to `StandardBios`.
        jne StandardBios

                              ;  /* if DAP cannot be used, don't use LBA */
                              ;  if ((regs.c.x & 1) == 0)
                              ;    goto StandardBios;
; Test whether the LBA bit is 1 in CL.
        test cl,1
; If the LBA bit is not 1 in CL, jump to `StandardBios`.
        jz StandardBios
; If the LBA bit is 1 in CL, jump to `LBABios`.
        jmp short LBABios



;struct _bios_LBA_address_packet            /* Used to access a hard disk via LBA */
;{
;  unsigned char packet_size;    /* size of this packet...set to 16  */
;  unsigned char reserved_1;     /* set to 0...unused                */
;  unsigned char number_of_blocks;       /* 0 < number_of_blocks < 128       */
;  unsigned char reserved_2;     /* set to 0...unused                */
;  UBYTE far *buffer_address;    /* addr of transfer buffer          */
;  unsigned long block_address;  /* LBA address                      */
;  unsigned long block_address_high;     /* high bytes of LBA addr...unused  */
;};

_bios_LBA_address_packet:
; The LBA packet size.
    db 0x10
    db 0
; The number of sectors to read.
    db 4                ; read four sectors - why not
;
    db 0
; The read buffer offset.
    dw 0x7c00           ; fixed boot address for DOS sector
; The read buffer segment.
    dw 0x0000
; The the 48-bit LBA sector number.
_bios_LBA_low  dw 0
_bios_LBA_high dw 0
    dw 0,0


LBABios:
                        ; copy start address of partition to DAP
; Put lower 2 bytes of address of the active partition to AX.
    mov ax,[di+8]
; Put lower 2 bytes of address of the active partition to the LBA packet.
    mov [0x7c00+ (_bios_LBA_low-real_start)],ax
; Put higher 2 bytes of address of the active partition to AX.
    mov ax,[di+8+2]
; Put higher 2 bytes of address of the active partition to the LBA packet.
    mov [0x7c00+ (_bios_LBA_high-real_start)],ax

; Specify to use interrupt 0x13 AH=0x42 service to read disk sectors using LBA
; addressing.
    mov ax,0x4200       ;  regs.a.x = LBA_READ;

; Put address of the LBA packet to SI, as required by interrupt 0x13
    mov si,0x7c00+ (_bios_LBA_address_packet-real_start); regs.si = FP_OFF(&dap);

; Invoke interrupt 0x13 AH=0x42 service.
; If have error, CF is 1.
    int 0x13
; Return.
    ret

;*****************************************************************
; read disk, using standard BIOS
;
StandardBios:
;   call print
;   db 'standard BIOS',0

; Specify to use interrupt 0x13 AH=0x02 service.
; AH 0x02 service means read sectors from drive using CHS addressing.
; AL 0x04 means read 4 sectors.
    mov ax,0x0204           ;  regs.a.x = 0x0201;
; Point ES:BX to [0x0000:0x7c00].
; Interrupt 0x13 AH=0x02 service will read sectors into this buffer.
    mov bx,0x7c00           ;  regs.b.x = FP_OFF(buffer);
; Put the cylinder number and the sector number to CX.
; CX stores both the cylinder number (10 bits, possible values are 0 to 1023)
; and the sector number (6 bits, possible values are 1 to 63).
; Layout:
; CX:        ---CH--- ---CL---
; Cylinder : 76543210 98
; Sector   :            543210
    mov cx,[di+2]           ;      regs.c.x =
                            ; ((chs.Cylinder & 0xff) << 8) + ((chs.Cylinder & 0x300) >> 2) +
                            ; chs.Sector;
                            ; that was easy ;-)
; Put the head number to DH.
    mov dh,[di+1]           ;  regs.d.b.h = chs.Head;
                            ;  regs.es = FP_SEG(buffer);
; Invoke interrupt 0x13 AH=0x02 service.
    int 0x13
; Return.
    ret



;****** PRINT
; prints text after call to this function.

print_1char:
; BH is page number.
; BL is color.
                xor   bx, bx                   ; video page 0
; 0x0E means TTY mode of interrupt 0x10 video service.
                mov   ah, 0x0E                 ; else print it
; Invoke interrupt 0x10 video service to print the character in AL.
                int   0x10                     ; via TTY mode
; Pop the offset of the next character to SI.
print:          pop   si                       ; this is the first character
; Put the character in [DS:SI] to AL.
; SI is incremented.
; Now SI points to one byte after the character.
; If the character in AL is value 0, it means end of characters, in which case
; SI points to the next instruction to return to.
print1:         lodsb                          ; get token
; Push SI as the potential return address.
                push  si                       ; stack up potential return address
; Test whether the character in AL is value 0.
                cmp   al, 0                    ; end of string?
; If the character in AL is not value 0, jump to `print_1char`.
                jne   print_1char              ; until done
; If the character in AL is value 0, return.
                ret                            ; and jump to it


; Fill zeros up to byte 510, exclusive.
        times   0x1fe-$+$$ db 0
; Put 0x55AA in the end of the boot sector.
        db 0x55,0xaa

```
