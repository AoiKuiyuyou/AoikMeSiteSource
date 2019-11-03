--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: FreeDOS source code study - compile kernel and make bootable images

author: Aoik

create_time: 2019-07-30 23:50:00

tags:
    - freedos-source-code-study
    - operating-system-study
    - 吸星大法强吃源码

post_id: 33

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# FreeDOS source code study - compile kernel and make bootable images

## Compile FreeDOS kernel and freecom

### Get FreeDOS kernel source code
Get FreeDOS kernel source code from [here](https://github.com/FDOS/kernel/archive/9d5abfe25aeff1bdbe325d49bc2dcae493a351bb.zip).

Put the downloaded file to `D:\freedos_build\freedos_kernel.zip`.

### Get FreeDOS freecom source code
Get FreeDOS freecom source code from [here](https://github.com/FDOS/freecom/archive/81535436f80343d7d111df381f2f9020bd1e3362.zip).

Put the downloaded file to `D:\freedos_build\freedos_freecom.zip`.

### Create echoto and echolib source code
The `echoto.bat` and `echolib.bat` programs that come with FreeDOS kernel and
freecom source code somehow do not work correctly. We need to replace the two
programs.

\
Create `D:\freedos_build\echoto.c`:
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

\
Create `D:\freedos_build\echolib.c`:
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
    
    fprintf(file, "%s", "&");

    fclose(file);

    return 0;
}
```

### Get Turbo C Turbo C++ and NASM
The author of [this kernel compiling process video](https://www.youtube.com/watch?v=Uwk91x5KgPc) has provided an [archive](https://archive.org/download/FreeDOS1.2_2017_04_28/FreeDOS%201.2.zip) that contains Turbo C 2.01, Turbo C++ 1.01 and NASM 0.98.

Put the downloaded file to `D:\freedos_build\freedos_compilers.zip`.

### Get WinRAR
Download `WinRAR` from [here](http://download.oldapps.com/Winrar/wrar380.exe). The version matters because it will be installed in Windows 98.

Put the downloaded file to `D:\freedos_build\winrar3.80.exe`.

### Run Windows 98 in a virtual machine
To build the FreeDOS kernel and freecom, a Windows 98 or Windows XP environment is needed.

Download `VirtualBox` from [here](https://download.virtualbox.org/virtualbox/6.0.10/VirtualBox-6.0.10-132072-Win.exe).

Download `Windows 98 SE VirtualBox hard disk image` from [here](https://archive.org/details/Windows98vdi).

Set up a virtual machine in VirtualBox. Set the operating system to be `Windows 98`. Attach the downloaded hard disk image. Set the network adapter to be `Host-only adapter`.

Start the virtual machine.

### Transfer files to the virtual machine
To transfer files to the Windows 98 virtual machine, we need to run an HTTP server on the host OS. `HFS` is a very easy to use HTTP server. Download `HFS` from [here](https://sourceforge.net/projects/hfs/files/HFS/2.3k/hfs2.3k.zip/download).

Decompress the archive to `D:\freedos_build\hfs`. Run `D:\freedos_build\hfs\hfs.exe`.

In menu `Menu - IP address`, select `192.168.56.1`. This is the IP of VirtualBox's host-only adapter on the host OS.

Drag `D:\freedos_build\freedos_kernel.zip` to HFS, it should be available to download via URL `http://192.168.56.1/freedos_kernel.zip` (The port number may be different depending on whether port 80 was occupied when HFS starts up.).

In the virtual machine, open the URL to download the file to `C:\freedos_build\freedos_kernel.zip`.

Drag `D:\freedos_build\freedos_freecom.zip` to HFS. In the virtual machine, download it to  `C:\freedos_build\freedos_freecom.zip`.

Drag `D:\freedos_build\echoto.c` to HFS. In the virtual machine, download it to  `C:\freedos_build\echoto.c`.

Drag `D:\freedos_build\echolib.c` to HFS. In the virtual machine, download it to  `C:\freedos_build\echolib.c`.

Drag `D:\freedos_build\freedos_compilers.zip` to HFS. In the virtual machine, download it to  `C:\freedos_build\freedos_compilers.zip`.

Drag `D:\freedos_build\winrar3.80.exe` to HFS. In the virtual machine, download it to  `C:\freedos_build\winrar3.80.exe`.

### Install WinRAR
In the virtual machine, run `C:\freedos_build\winrar3.80.exe` to install WinRAR.

### Install NASM
In the virtual machine, decompress `C:\freedos_build\freedos_compilers.zip` to `C:\freedos_build\freedos_compilers_temp`.

Move directory `C:\freedos_build\freedos_compilers_temp\FreeDOS 1.2` to `C:\freedos_build\freedos_compilers`.

Remove `C:\freedos_build\freedos_compilers_temp`.

Make sure file `C:\freedos_build\freedos_compilers\nasm098.exe` is there.

### Install Turbo C
In the command console, run:
```
cd C:\freedos_build\freedos_compilers\tc201inst

install.exe
```

In the prompt `Enter the SOURCE drive to use:`, enter `C`.

In the prompt `Turbo C Directory:`, enter `C:\TC201`.

In other prompts simply use default settings.

### Install Turbo C++
In the command console, run:
```
cd C:\freedos_build\freedos_compilers\tc101inst

install.exe
```

In the prompt `Enter the SOURCE drive to use:`, enter `C`.

In the prompt `Turbo C++ Directory:`, enter `C:\TCPP`.

In other prompts simply use default settings.

### Compile echoto and echolib
In the command console, run:
```
cd C:\freedos_build

SET PATH=%PATH%;C:\tc201

tcc -IC:\tc201\INCLUDE -LC:\tc201\LIB echoto.c

tcc -IC:\tc201\INCLUDE -LC:\tc201\LIB echolib.c
```

The result files are `C:\freedos_build\echoto.exe` and `C:\freedos_build\echolib.exe`.

### Compile FreeDOS kernel
Decompress `C:\freedos_build\freedos_kernel.zip` to `C:\freedos_build\freedos_kernel`

Rename `C:\freedos_build\freedos_kernel\utils\echoto.bat` to `C:\freedos_build\freedos_kernel\utils\echoto.bat.bak`.

Copy `C:\freedos_build\echoto.exe` to `C:\freedos_build\freedos_kernel\utils\echoto.exe`.

\
Edit `C:\freedos_build\freedos_kernel\kernek\makefile`, change
```
$(TARGET).lnk: turboc.cfg makefile ../mkfiles/generic.mak ../mkfiles/$(COMPILER).mak
        -$(RM) *.lnk
        $(ECHOTO) $(TARGET).lnk $(OBJS1)+
        $(ECHOTO) $(TARGET).lnk $(OBJS2)+
        $(ECHOTO) $(TARGET).lnk $(OBJS3)+
        $(ECHOTO) $(TARGET).lnk $(OBJS4)+
        $(ECHOTO) $(TARGET).lnk $(OBJS5)+
        $(ECHOTO) $(TARGET).lnk $(OBJS6)+
        $(ECHOTO) $(TARGET).lnk $(OBJS7)+
        $(ECHOTO) $(TARGET).lnk $(OBJS8)
        $(ECHOTO) $(TARGET).lnk kernel.exe
        $(ECHOTO) $(TARGET).lnk kernel.map
        $(ECHOTO) $(TARGET).lnk $(LIBS)
```
to
```
$(TARGET).lnk: turboc.cfg makefile ../mkfiles/generic.mak ../mkfiles/$(COMPILER).mak
        -$(RM) *.lnk
        $(ECHOTO) $(TARGET).lnk $(OBJS1)+
        $(ECHOTO) $(TARGET).lnk $(OBJS2)+
        $(ECHOTO) $(TARGET).lnk $(OBJS3)+
        $(ECHOTO) $(TARGET).lnk $(OBJS4)+
        $(ECHOTO) $(TARGET).lnk $(OBJS5)+
        $(ECHOTO) $(TARGET).lnk $(OBJS6)+
        $(ECHOTO) $(TARGET).lnk $(OBJS7)+
        $(ECHOTO) $(TARGET).lnk $(OBJS8)+
        $(ECHOTO) $(TARGET).lnk , kernel.exe
        $(ECHOTO) $(TARGET).lnk , kernel.map
        $(ECHOTO) $(TARGET).lnk , $(LIBS)
```
Notice the added one `+` and three `,`.

\
Copy `C:\freedos_build\freedos_kernel\config.b` to `C:\freedos_build\freedos_kernel\config.bat`.

Edit `C:\freedos_build\freedos_kernel\config.bat`:
```
set XNASM=nasm098.exe

set COMPILER=TC2

set TC2_BASE=c:\tc201

set XLINK=tlink /m/c/s/l

set PATH=%PATH%;%TC2_BASE%;C:\freedos_build\freedos_compilers

set MAKE=%TC2_BASE%\make

set XCPU=86

set XFAT=32
```
Comment out other variables.

\
In the command console, run:
```
cd C:\freedos_build\freedos_kernel

clobber.bat

build.bat
```

\
The result files are:
- `C:\freedos_build\freedos_kernel\bin\country.sys`
- `C:\freedos_build\freedos_kernel\bin\kernel.sys`
- `C:\freedos_build\freedos_kernel\bin\ktc8632.map`
- `C:\freedos_build\freedos_kernel\bin\ktc8632.sys`
- `C:\freedos_build\freedos_kernel\bin\sys.com`
- `C:\freedos_build\freedos_kernel\boot\fat12com.bin`

The `C:\freedos_build\freedos_kernel\bin` directory also contains:
- `C:\freedos_build\freedos_kernel\bin\autoexec.bat`
- `C:\freedos_build\freedos_kernel\bin\config.sys`
- `C:\freedos_build\freedos_kernel\bin\install.bat`

### Compile FreeDOS freecom
Decompress `C:\freedos_build\freedos_freecom.zip` to `C:\freedos_build\freedos_freecom`

\
Rename `C:\freedos_build\freedos_freecom\scripts\echoto.bat` to `C:\freedos_build\freedos_freecom\scripts\echoto.bat.bak`.

Rename `C:\freedos_build\freedos_freecom\scripts\echolib.bat` to `C:\freedos_build\freedos_freecom\scripts\echolib.bat.bak`.

\
Copy `C:\freedos_build\echoto.exe` to `C:\freedos_build\freedos_freecom\scripts\echoto.exe`.

Copy `C:\freedos_build\echolib.exe` to `C:\freedos_build\freedos_freecom\scripts\echolib.exe`.

\
Edit `C:\freedos_build\freedos_freecom\cmd\cmd.mak`, change
```
echolib.bat : ../scripts/echolib.bat
    $(CP) ..$(DIRSEP)scripts$(DIRSEP)echolib.bat .

cmds.rsp : echolib.bat cmd.mak
```
to
```
echolib.exe : ../scripts/echolib.exe
    $(CP) ..$(DIRSEP)scripts$(DIRSEP)echolib.exe .

cmds.rsp : echolib.exe cmd.mak
```
Notice four `.bat` have been changed to `.exe`.

\
Edit `C:\freedos_build\freedos_freecom\lib\lib.mak`, change
```
echolib.bat : ../scripts/echolib.bat
    $(CP) ..$(DIRSEP)scripts$(DIRSEP)echolib.bat .

freecom.rsp : echolib.bat $(OBJ16) $(OBJ17) $(OBJ18) $(OBJ19) $(OBJ20) \
```
to
```
echolib.exe : ../scripts/echolib.exe
    $(CP) ..$(DIRSEP)scripts$(DIRSEP)echolib.exe .

freecom.rsp : echolib.exe $(OBJ16) $(OBJ17) $(OBJ18) $(OBJ19) $(OBJ20) \
```
Notice four `.bat` have been changed to `.exe`.

\
Edit `C:\freedos_build\freedos_freecom\shell\command.mak`, change
```
echoto.bat: ../scripts/echoto.bat
    $(CP) ..$(DIRSEP)scripts$(DIRSEP)echoto.bat .

command.rsp : echoto.bat
    $(RMFILES) command.rsp
    $(ECHOTO0) command.rsp $(OBJ1)+
    $(ECHOTO0) command.rsp $(OBJ2)+
    $(ECHOTO0) command.rsp $(OBJ3)+
    $(ECHOTO0) command.rsp $(OBJ4)
    $(ECHOTO0) command.rsp command.exe
    $(ECHOTO0) command.rsp command.map
    $(ECHOTO0) command.rsp $(LIBS)
```
to
```
echoto.exe: ../scripts/echoto.exe
    $(CP) ..$(DIRSEP)scripts$(DIRSEP)echoto.exe .

command.rsp : echoto.exe
    $(RMFILES) command.rsp
    $(ECHOTO0) command.rsp $(OBJ1)+
    $(ECHOTO0) command.rsp $(OBJ2)+
    $(ECHOTO0) command.rsp $(OBJ3)+
    $(ECHOTO0) command.rsp $(OBJ4)+
    $(ECHOTO0) command.rsp , command.exe
    $(ECHOTO0) command.rsp , command.map
    $(ECHOTO0) command.rsp , $(LIBS)
```
Notice four `.bat` have been changed to `.exe`, and the added one `+` and three `,`.

\
Edit `C:\freedos_build\freedos_freecom\suppl\src\suppl.mak`, change
```
echolib.bat: ../../scripts/echolib.bat
    $(CP) ..$(DIRSEP)..$(DIRSEP)scripts$(DIRSEP)echolib.bat .

# Prepare Linker Response File
objlist.txt: echolib.bat suppl.mak
```
to
```
echolib.exe: ../../scripts/echolib.exe
    $(CP) ..$(DIRSEP)..$(DIRSEP)scripts$(DIRSEP)echolib.exe .

# Prepare Linker Response File
objlist.txt: echolib.exe suppl.mak
```
Notice four `.bat` have been changed to `.exe`.

\
Copy `C:\freedos_build\freedos_freecom\config.std` to `C:\freedos_build\freedos_freecom\config.mak`.

\
Copy `C:\freedos_build\freedos_freecom\config.b` to `C:\freedos_build\freedos_freecom\config.bat`.

Edit `C:\freedos_build\freedos_freecom\config.bat`:
```
set XNASM=nasm098.exe

set COMPILER=TURBOCPP

set TP1_BASE=c:\tcpp

set PATH=%PATH%;%TP1_BASE%\bin;C:\freedos_build\freedos_compilers
```

\
In the command console, run:
```
cd C:\freedos_build\freedos_freecom

clean.bat

build.bat -r xms-swap english
```

The result file is `C:\freedos_build\freedos_freecom\command.com`.

## Make FreeDOS bootable images

### Transfer files to the host OS
In the virtual machine, run:
```
mkdir C:\freedos_build\freedos_fd

COPY C:\freedos_build\freedos_kernel\bin\* C:\freedos_build\freedos_fd

COPY C:\freedos_build\freedos_kernel\boot\fat12com.bin C:\freedos_build\freedos_fd

COPY C:\freedos_build\freedos_freecom\command.com C:\freedos_build\freedos_fd
```

Use WinRAR to create an archive file `C:\freedos_build\freedos_fd.zip`.

\
To transfer `C:\freedos_build\freedos_fd.zip` to the host OS, we run an HTTP file
upload service on the host OS. The service is written in Python. Create file `D:\freedos_build\http_file_upload_service.py`:
```
# coding: utf-8

from __future__ import absolute_import

import os

from flask import abort
from flask import Flask
from flask import request
from werkzeug import secure_filename

UPLOAD_FOLDER = 'D:/freedos_build'

FLASK_APP = Flask(__name__)

@FLASK_APP.route('/', methods=['GET', 'POST'])
def index_handler():
    if request.method == 'GET':
        html = r"""
<!doctype html>
<html>
    <body>
        <h1>Upload file</h1>
        <form action="" method=post enctype=multipart/form-data>
          <p><input type=file name=file><input type=submit value=Upload></p>
        </form>
    </body>
<html>
"""

        return html

    if request.method == 'POST':
        file = request.files['file']
        
        if not file or not file.filename:
            abort(400)
        
        file_name = secure_filename(file.filename)
        
        file_path = os.path.join(UPLOAD_FOLDER, file_name)
        
        file.save(file_path)
        
        return 'SUCCESS'

    abort(405)

if __name__ == '__main__':
    FLASK_APP.run(host='192.168.56.1', port=8000)
```

Install `flask`:
```
python -m pip install flask
```

Run the service:
```
python D:\freedos_build\http_file_upload_service.py
```

Open `http://192.168.56.1:8000/` in the virtual machine.

Upload `C:\freedos_build\freedos_fd.zip` to the service.

The file will be put to `D:\freedos_build\freedos_fd.zip` in the host OS.

### Make FreeDOS bootable images on Windows

#### Install bfi
`bfi` is used to create a floppy image that contains FreeDOS' files. The floppy
image will then be used to create a CD image in floppy emulation mode.

Download `bfi` from [here](https://www.softpedia.com/get/System/Boot-Manager-Disk/BFI.shtml#download).

Decompress the archive put `bfi.exe` to `D:\freedos_build\bfi\bfi.exe`

#### Install mkisofs
`mkisofs` is used to create a CD image.

Download `CDR-Tools` from [here](https://sourceforge.net/projects/cdrtoolswin/files/1.0/Binaries/CDR-Tools.exe/download).

Run `CDR-Tools.exe` and it will install `mkisofs.exe` to `C:\Program Files (x86)\cdrtools\mkisofs.exe`.

#### Make bootable FD image
Decompress `D:\freedos_build\freedos_fd.zip` to `D:\freedos_build\freedos_fd`.

Run:
```
D:\freedos_build\bfi\bfi.exe -b=D:\freedos_build\freedos_fd\fat12com.bin -f=D:\freedos_build\freedos.ima D:\freedos_build\freedos_fd
```

The FD image is `D:\freedos_build\freedos_cd\freedos.ima`.

#### Make bootable CD image
Run:
```
mkdir D:\freedos_build\freedos_cd

COPY D:\freedos_build\freedos.ima D:\freedos_build\freedos_cd\freedos.ima

"C:\Program Files (x86)\cdrtools\mkisofs.exe" -J -N -l -v -relaxed-filenames -V FreeDOS -b freedos.ima -o D:\freedos_build\freedos.iso D:\freedos_build\freedos_cd
```

The CD image is `D:\freedos_build\freedos.iso`.

### Make FreeDOS bootable images on Linux

#### Make bootable FD image
Create empty floppy image:
```
mkfs.vfat -C ~/freedos_build/freedos.ima 1440
```

\
Install FreeDOS' boot sector to the floppy image:
```
cd ~/freedos_build

unzip freedos_fd.zip

dd conv=notrunc if=~/freedos_build/freedos_fd/fat12com.bin of=~/freedos_build/freedos.ima bs=512 count=1
```

\
Copy FreeDOS' files to the floppy image:
```
mkdir -v ~/freedos_build/freedos_fd_mount

mount -o loop -t vfat ~/freedos_build/freedos.ima ~/freedos_build/freedos_fd_mount

cp -v ~/freedos_build/freedos_fd/* ~/freedos_build/freedos_fd_mount

umount ~/freedos_build/freedos_fd_mount
```

The FD image is `~/freedos_build/freedos.ima`.

#### Make bootable CD image
Run:
```
mkdir -v ~/freedos_build/freedos_cd

cp -v ~/freedos_build/freedos.ima freedos_cd/freedos.ima

mkisofs -J -N -l -v -relaxed-filenames -V FreeDOS -b freedos.ima -o ~/freedos_build/freedos.iso freedos_cd
```

The CD image is `~/freedos_build/freedos.iso`.
