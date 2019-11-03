--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Windows 10 installation fixes error "We could not create a new partition or locate an existing one"

author: Aoik

create_time: 2018-11-26 23:30:00

tags:
    - windows-installation

post_id: 6

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Windows 10 installation fixes error "We could not create a new partition or locate an existing one"

I was using a USB disk to install Windows 10. According to my previous experience in installing Windows 7 in non-UEFI mode, if I use Windows setup program to do disk partitioning, it will create a 100MB partition to hold the "boot" directory separately. However if I partition the disk in advance with another tool, Windows setup program will put the "boot" directory in the system partition, along with other Window system files. I prefer to put the "boot" directory in the system partition, so I used another USB disk to boot into Linux Mint 19 to run GParted to do the partitioning. The internal disk is partitioned into 10GB, 100GB, etc. The 10GB is reserved for the EFI system partition. The 100GB is reserved for Windows system partition. Then I used Rufus to write files of Windows 10 installation image to a USB disk. Then I booted from the USB disk in UEFI mode. The setup program was running, but in the step to select the partition to which to install Windows, when I clicked the "Next" button, the setup program said: "We couldn't create a new partition or locate an existing one.".

In the web similar cases have been reported. There are at least two methods suggested for a fix. The first method says that the Windows setup program has been confused by the USB disk and suggests to adjust the order of the disks in BIOS, putting the internal disk before the USB disk, or to plug off the USB disk and plug in again. The second method opens a command line (by pressing Shift+F10) in the stuck step and uses "diskpart" to re-create the Windows system partition, and then uses "xcopy" to copy some files from the USB disk to the system partition. Unfortunately neither of the two methods works in my case.

One fact I have observed is that if I booted in non-UEFI mode, Windows setup program can get though that step without a problem. So the error has something to do with UEFI mode.

Luckily I came across another method that suggests to delete the Windows system partition and re-create the partition using the function provided by Windows setup program. When re-creating the partition, Windows setup program said it may create additional partitions besides the system partition. In the end there were three additional partitions created: 500MB NTFS labeled "Recovery", 100MB FAT32 labeled "ESP", and 16MB MSR labeled "MSR".

Now the cause of the error is clear: in UEFI mode, the Windows setup program needs to create additional partitions but will fail doing so if the disk is partitioned before hand.

BTW, this error has been observed in Windows 7 installation as well.
