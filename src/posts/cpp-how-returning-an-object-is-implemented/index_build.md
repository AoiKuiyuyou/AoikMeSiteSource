--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: C++ how returning an object is implemented

author: Aoik

create_time: 2019-08-25 20:00:00

tags:
    - cpp

post_id: 44

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# C++ how returning an object is implemented
In Visual Studio 2015, create a `Visual C++ -- Win32 Console Application` empty
project. In the project's `Configuration Properties -- C/C++ -- Optimization`
page, set `Optimization` to `Disabled (/Od)`.

\
Create **main.cpp**:
```
#include <iostream>
#include <string>


class Point
{
private:
    int m_x;
    int m_y;

public:
    Point(int x, int y) {
        std::cout << "Constructor" << std::endl;

        this->m_x = x;

        this->m_y = y;
    }

    Point(const Point& src) {
        std::cout << "Copy Constructor" << std::endl;

        this->m_x = src.m_x;

        this->m_y = src.m_y;
    }

    Point(const Point&& src) {
        std::cout << "Move Constructor" << std::endl;

        this->m_x = src.m_x;

        this->m_y = src.m_y;
    }

    Point& operator=(const Point& src) {
        std::cout << "Copy Assignment" << std::endl;

        this->m_x = src.m_x;

        this->m_y = src.m_y;

        return *this;
    }

    Point& operator=(const Point&& src) {
        std::cout << "Move Assignment" << std::endl;

        this->m_x = src.m_x;

        this->m_y = src.m_y;

        return *this;
    }
};


Point make_point(int x, int y)
{
    Point new_point {x, y};

    return new_point;
}


int main(int argc, char* argv[])
{
    Point point = make_point(0x11, 0x22);

    return 0;
}
```

\
The output of the program:
```
Constructor
Move Constructor
```

\
**main**'s assembly code:
```
int main(int argc, char* argv[])
    // Push caller's EBP.
    push        ebp
    // Put caller's ESP to EBP.
    mov         ebp,esp
    // Reserve space for variable `point`.
    // [ebp-8]: Variable `point`.
    sub         esp,8
    // Push the second argument for `make_point` below.
    push        22h
    // Push the first argument for `make_point` below.
    push        11h
    // Put variable `point`'s address to EAX.
    lea         eax,[ebp-8]
    // Push variable `point`'s address as return value address for
    // `make_point` below.
    push        eax
    // Call `make_point`.
    call        make_point
    // Release the latest 3 pushes.
    add         esp,0Ch
    // Put return value 0 to EAX.
    xor         eax,eax
}
```

\
**make_point**'s assembly code:
```
Point make_point(int x, int y)
{
    // Push caller's EBP.
    push        ebp
    // Put caller's ESP to EBP.
    // [ebp+10h]: Argument `y`.
    // [ebp+0Ch]: Argument `x`.
    // [ebp+8]: Return value.
    mov         ebp,esp
    // Reserve space for variable `new_point`.
    // [ebp-8]: Variable `new_point`.
    sub         esp,8
    // Put argument `y` to EAX.
    mov         eax,dword ptr [ebp+10h]
    // Push argument `y` as the second argument for constructor `Point::Point`
    // below.
    push        eax
    // Put argument `x` to ECX.
    mov         ecx,dword ptr [ebp+0Ch]
    // Push argument `x` as the first argument for constructor `Point::Point`
    // below.
    push        ecx
    // Put variable `new_point`'s address to ECX as `this` pointer for
    // constructor `Point::Point` below.
    lea         ecx,[ebp-8]
    // Call constructor `Point::Point`.
    call        Point::Point
    // Put variable `new_point`'s address to EDX.
    lea         edx,[ebp-8]
    // Push variable `new_point`'s address as the first argument for move
    // constructor `Point::Point` below.
    push        edx
    // Put return value's address to ECX as `this` pointer for move constructor
    // `Point::Point` below.
    mov         ecx,dword ptr [ebp+8]
    // Call move constructor `Point::Point`.
    call        Point::Point
    // Put return value's address to EAX.
    mov         eax,dword ptr [ebp+8]
    // Put caller's ESP to ESP.
    mov         esp,ebp
    // Pop caller's EBP to EBP.
    pop         ebp
    // Return.
    ret
}
```

\
As shown in the assembly code, `make_point`'s return value's space is allocated
in `main`'s stack frame. The return value's address is pushed to stack as an
implicit argument for `make_point`. `make_point` calls move constructor using
the return value's address as `this` pointer.
