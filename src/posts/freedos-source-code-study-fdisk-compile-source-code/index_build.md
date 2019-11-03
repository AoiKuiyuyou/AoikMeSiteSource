--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: FreeDOS source code study - fdisk compile source code

author: Aoik

create_time: 2019-08-15 23:00:00

tags:
    - freedos-source-code-study
    - fdisk
    - 吸星大法强吃源码

post_id: 35

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# FreeDOS source code study - fdisk compile source code

## Prepare operating system
The OS can be Windows 98 or Windows XP.

## Install NASM
Download NASM from [here](https://sourceforge.net/projects/nasm/files/DOS%2016-bit%20binaries%20%28OBSOLETE%29/0.98.39/nsm09839.zip/download).

Decompress the archive to `C:\fdisk_build\nasm`.

Make sure `C:\fdisk_build\nasm\nasm.exe` is there.

## Install Turbo C++
Download Turbo C++ from [here](https://winworldpc.com/download/461329c3-9a18-c39a-11c3-a4e284a2c3a5).

Decompress the archive to `C:\fdisk_build\turbocpp_images`.

The directory contains five floppy image files:
- Disk01.img
- Disk02.img
- Disk03.img
- Disk04.img
- Disk05.img

Download Virtual Floppy Drive from [here](https://sourceforge.net/projects/vfd/files/2.1%20%28February%2006%2C%202008%29/vfd21-080206.zip/download).

Decompress the archive to `C:\fdisk_build\vfd`.

Run `C:\fdisk_build\vfd\vfdwin.exe`.

In tab `Driver`, click `Install` and `Start`.

In tab `Drive0`, click `Change` to add drive `A:`.

Click `Open/Create...` to mount image file `C:\fdisk_build\turbocpp_images\Disk01.img`.

Click `A:\INSTALL.EXE` to start Turbo C++ installation.

During the installation, use Virtual Floppy Drive to switch the floppy image according to the prompt.

Install Turbo C++ to `C:\fdisk_build\turbocpp`.

Make sure `C:\fdisk_build\turbocpp\bin\tcc.exe` is there.

## Prepare fdisk source code
Download fdisk source code from [here](https://github.com/FDOS/fdisk/tree/769d52be0ac37d0cd1b1e140609b97ad8eeec592).

Decompress the archive to `C:\fdisk_build\fdisk`.

\
Copy `C:\fdisk_build\fdisk\SOURCE\BOOTEASY\BOOTEASY.ASM` to `C:\fdisk_build\fdisk\SOURCE\FDISK\BOOTEASY.ASM`.

Copy `C:\fdisk_build\fdisk\SOURCE\BOOTNORM\BOOTNORM.ASM` to `C:\fdisk_build\fdisk\SOURCE\FDISK\BOOTNORM.ASM`.

\
Decompress `C:\fdisk_build\fdisk\SOURCE\CATS396S.ZIP` to `C:\fdisk_build\fdisk\SOURCE\CATS396S`.

I tried building `CATS` into `catdb.lib` using Turbo C 2.01, then link with it
when building fdisk. The linking failed for unknown reason. So instead we build
CATS directly with fdisk.

Copy `CATGETS.C`, `DB.C`, and `GET_LINE.C` from `C:\fdisk_build\fdisk\SOURCE\CATS396S\CATS39\LIB` to `C:\fdisk_build\fdisk\SOURCE\FDISK`.

\
Apply the following changes to `C:\fdisk_build\fdisk\SOURCE\FDISK\GET_LINE.C`.

Change line 44
```
str = malloc (sizeof (char) * str_size);
```
to
```
str = (char*) malloc (sizeof (char) * str_size);
```

Change line 64
```
tmp_str = realloc (str, sizeof (char) * str_size);
```
to
```
tmp_str = (char*) realloc (str, sizeof (char) * str_size);
```

\
Apply the following changes to `C:\fdisk_build\fdisk\SOURCE\FDISK\MAKEFILE`.

Change
```
OBJ = main.obj bootnormal.obj booteasy.obj cmd.obj fdiskio.obj \
      helpscr.obj kbdinput.obj pdiskio.obj pcompute.obj \
      userint1.obj userint2.obj
```
to
```
OBJ1 = main.obj bootnormal.obj booteasy.obj cmd.obj fdiskio.obj
OBJ2 = helpscr.obj kbdinput.obj pdiskio.obj pcompute.obj
OBJ3 = userint1.obj userint2.obj db.obj catgets.obj get_line.obj
OBJ = $(OBJ1) $(OBJ2) $(OBJ3)
```

Change
```
ui2.obj: userint2.c
 $(CC) $(CFLAGS) -c userint2.cc
```
to
```
ui2.obj: userint2.c
 $(CC) $(CFLAGS) -c userint2.c

db.obj: db.c
 $(CC) $(CFLAGS) -c db.c 

catgets.obj: catgets.c 
 $(CC) $(CFLAGS) -c catgets.c

get_line.obj: get_line.c
 $(CC) $(CFLAGS) -c get_line.c
```

### Build echoto
The command that builds `fdisk.exe` will fail with "Arguments list too long"
error. The workaround is to put its arguments in a temp file. To create the
temp file, we need an `echoto` program.

Create `C:\fdisk_build\echoto\echoto.c`:
```
#include <stdio.h>

int main(int argc, char *argv[])
{
    FILE *file;
    char* fileName;
    int i;

    if (argc <= 1)
    {
        return 0;
    }

    fileName = argv[1];

    file = fopen(fileName, "a");

    if (file == NULL) {
        return 1;
    }

    for (i = 2; i < argc; i++)
    {
        fprintf(file, "%s ", argv[i]);
    }

    fclose(file);

    return 0;
}
```

In the command console, run
```
cd C:\fdisk_build\echoto

SET PATH=%PATH%;C:\fdisk_build\turbocpp\bin

tcc -IC:\fdisk_build\turbocpp\INCLUDE -LC:\fdisk_build\turbocpp\LIB echoto.c
```

The result file is `C:\fdisk_build\echoto\echoto.exe`.

Copy `C:\fdisk_build\echoto\echoto.exe` to `C:\fdisk_build\fdisk\SOURCE\FDISK\echoto.exe`.

Edit `C:\fdisk_build\fdisk\SOURCE\FDISK\MAKEFILE`, change
```
fdisk.exe: main.obj $(OBJ)  
 $(CC) $(LDFLAGS) -efdisk $(OBJ) $(LDLIBS)
```
to
```
fdisk.exe: main.obj $(OBJ)
 $(RM) objs_list.txt
 echoto.exe objs_list.txt $(OBJ1)
 echoto.exe objs_list.txt $(OBJ2)
 echoto.exe objs_list.txt $(OBJ3)
 $(CC) $(LDFLAGS) -efdisk $(LDLIBS) @objs_list.txt
```

### Build fdisk
In the command console, run
```
cd C:\fdisk_build\fdisk\SOURCE\FDISK

C:\fdisk_build\nasm\nasm.exe -f obj bootnorm.asm

C:\fdisk_build\nasm\nasm.exe -f obj booteasy.asm

SET PATH=%PATH%;C:\fdisk_build\turbocpp\bin

make all
```

The result file is `C:\fdisk_build\fdisk\SOURCE\FDISK\fdisk.exe`.
