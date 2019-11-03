--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Lua compile and embed in Windows

author: Aoik

create_time: 2019-03-21 20:00:00

tags:
    - lua

post_id: 13

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Lua compile and embed in Windows
First we will build Lua source code into a static library.

Download Lua source code from [here](https://www.lua.org/download.html). 5.3.5 is the latest version as of this writing.

Decompress the archive file `lua-5.3.5.tar.gz`.

In Visual Studio 2015, click menu `File` - `New` - `Project...`. In the dialog, click menu `Templates` - `Visual C++` - `Empty Project`. In the `Name:` textbox, enter the project name. In the `Location:` textbox, enter where to put the project. In the `Solution name:` textbox, enter the solution name. Click `OK` button to create the project.

In the `Solution Explorer` panel, right click the project name, click menu `Properties`. In the `Properties` dialog, click menu `Configuration Properties` - `General`. Set `Target Name` to `lua`. Set `Target Extension` to `.lib`. Set `Configuration Type` to `Static library (.lib)`.

In the `Solution Explorer` panel, right click the project name, click menu `Add...` - `Existing items...`. Add all the files in the `src` directory of Lua source code to the project, excluding `lua.c` and `luac.c`.

Click menu `Build` - `Configuration Manager...`. Set `Active solution configuration` to `Release`. Set `Active solution platform` to `x64`.

Build the project.

If the build is successful, the result file is `x64/Release/lua.lib`.

Now we will use the static library in another project.

In Visual Studio 2015, create another Visual C++ empty project. 

Create a `lib` directory in the project directory. Put `lua.lib` in it.

In the `Solution Explorer` panel, right click the project name, click menu `Properties`. In the `Properties` dialog, click menu `Configuration Properties` - `C/C++` - `General`. Add path of Lua source code's `src` directory to `Additional Include Directories`. In the `Properties` dialog, click menu `Configuration Properties` - `Linker` - `General`. Add path of the `lib` directory containing `lua.lib` to `Additional Library Directories`. Click `OK` button.

Click menu `Build` - `Configuration Manager...`. Set `Active solution configuration` to `Release`. Set `Active solution platform` to `x64`.

Create a `main.c` file:
```
#pragma comment(lib, "lua.lib")

#include "lua.h"
#include "lualib.h"
#include "lauxlib.h"

static int sum(lua_State *L)
{
  // Get the number of arguments
  int args_count = lua_gettop(L);

  double args_sum = 0;

  int i;

  for (i = 1; i <= args_count; i++)
  {
    if (!lua_isnumber(L, i))
    {
      lua_pushstring(L, "Argument is not a number.");

      lua_error(L);
    }

    args_sum += lua_tonumber(L, i);
  }

  lua_pushnumber(L, args_sum);

  // Return the number of results
  return 1;
}

int main(int argc, char *argv[])
{
  lua_State* L = luaL_newstate();

  luaL_openlibs(L);

  lua_pushstring(L, "hello");

  lua_setglobal(L, "GLOBAL_VALUE");

  lua_register(L, "sum", sum);

  luaL_dostring(L, "print('To run `demo.lua`')");

  luaL_dofile(L, "demo.lua");

  lua_close(L);

  return 0;
}
```

Build the project.

If the build is successful, the result file is `x64/Release/Demo.exe` (The file name depends on your project name.).

Create a `demo.lua` file in the `x64/Release` directory:
```
local sum_value = sum(1, 2, 3)

print("The sum is "..sum_value)

print("GLOBAL_VALUE is "..GLOBAL_VALUE)
```

Run `Demo.exe`.

`Demo.exe` will run `demo.lua`.

We can see `demo.lua` is able to access the global value `GLOBAL_VALUE` and the `sum` function defined in the C program.
