--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Navigate Linux kernel source code using Eclipse

author: Aoik

create_time: 2019-03-20 20:00:00

tags:
    - linux
    - eclipse

post_id: 12

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Navigate Linux kernel source code using Eclipse
I've learned the way to set up Eclipse to navigate Linux kernel source code from [this post](https://wiki.eclipse.org/HowTo_use_the_CDT_to_navigate_Linux_kernel_source). It is tested to work with Eclipse IDE 2018-12 and Linux kernel 5.0.3 too. Below are the steps.

Download Linux kernel source code from [here](https://www.kernel.org/). 5.0.3 is the latest stable version as of this writing.

Decompress the archive file:
```
tar xvf linux-5.0.3.tar.xz
```

Put the decompressed directory somewhere of your choice:
```
mkdir -p /opt/linux_kernel/5.0.3

mv -Tv linux-5.0.3 /opt/linux_kernel/5.0.3/code
```

Generate the `kconfig.h` file that will be used by Eclipse's indexer:
```
cd /opt/linux_kernel/5.0.3/code

make prepare
```

Download `Eclipse IDE for C/C++ Developers` from [here](https://www.eclipse.org/downloads/packages/). Eclipse IDE 2018-12 is the latest version as of this writing.

Decompress the archive file:
```
tar xvf eclipse-cpp-2018-12-R-linux-gtk-x86_64.tar.gz
```

Put the decompressed directory somewhere of your choice:
```
mkdir -p /opt/eclipse/2018-12

mv -Tv eclipse /opt/eclipse/2018-12/dst
```

Create a link file for the `eclipse` executable file:
```
ln -sf /opt/eclipse/2018-12/dst/eclipse /usr/local/bin/eclipse
``` 

Run the `eclipse` executable file:
```
eclipse
```

Click menu `File` - `New` - `Makefile Project with Existing Code`.

In the `Project Name` textbox, enter the project name of your choice.

In the `Existing Code Location`, enter the kernel source code location `/opt/linux_kernel/5.0.3/code`.

In the `Toolchain for Indexer Settings` listbox, select `Linux GCC`

Click `Finish` button.

In the `Project Explorer` panel, right click the project name, click menu `Properties`.

In the `Properties` dialog, click menu `C/C++ General` - `Indexer`. Enable the `Enable project specific settings` checkbox. Disable the `Index source files not included in the build` checkbox. Disable the `Enable indexer` checkbox. Click `Apply` button. This will disable the indexer for now. We will enable it after the configuration the done.

In the `Properties` dialog, click menu `C/C++ General` - `Preprocessor Include`. In the `Entries` tab, in the `Languages` listbox, select `GNU C`. In the `Setting Entries` listbox, select `CDT User Settings Entries`. Click `Add...` button. In the dialog's top left drop-down list, select `Preprocessor Macro File`. In the `File:` textbox, enter the `kconfig.h` file's path `/opt/linux_kernel/5.0.3/code/include/linux/kconfig.h`. Click `OK` button. In the `Providers` tab, select `CDT GCC Built-in Compiler Settings`. Disable the `Use global provider shared between projects` checkbox. In the `Command to get compile specs` textbox, append ` -nostdinc -iwithprefix include`. Enable the `Allocate console in the Console View` checkbox. Click `Apply` button.

In the `Properties` dialog, click menu `C/C++ General` - `Paths and Symbols`. In the `Includes` tab, in the `Languages` listbox, select `GNU C`. Click `Add...` button. Click `Workspace...` button. Select kernel source code's `include`, `include/uapi`, `arch/x86/include`, and `arch/x86/include/uapi` directories. In the `Symbols` tab, in the `Languages` listbox, select `GNU C`. Click `Add...` button. In the `Name:` textbox, enter `__KERNEL__`. In the `Value:` textbox, enter `1`. Click `OK` button. In the `Source Location` tab, click the little arrow next to your project name to expand it to show the `Filter` item. Click the `Filter` item. Click `Edit Filter...` button. Select all of the `arch/*` directories that are not `arch/x86`. Click `OK` button. Click `Apply` button.

In the `Properties` dialog, click menu `C/C++ General` - `Indexer`. Enable the `Enable indexer` checkbox. Click `Apply` button. This will enable the indexer.

It takes a while for the indexing to finish. After it is done, you should be able to jump to symbol definition with Ctrl+Click. I also recommend you to set the `Backward History` and `Forward History` hotkeys to jump back and forth easily.
