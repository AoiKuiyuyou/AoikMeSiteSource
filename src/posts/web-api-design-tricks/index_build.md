--- yaml | extend://meta://root://src/posts/_base/post_page_base_build.md

title: Web API design tricks

author: Aoik

create_time: 2018-11-15 20:00:00

tags:
    - web-api

post_id: 5

$template:
    file: root://src/posts/_base/post_page_base.html

    builder: root://tools/nunjucks/nunjucks_builder.js

$output: chroot://path=./index.html&from=root://src&to=root://release

--- markdown | template | output
# Web API design tricks
I'd like to talk about several tricks I use when implementing web APIs.
Here Web APIs mean HTTP backends that return JSON result.

The demo code below is using Go language's Gin web framework, however the ideas should be transferable to other languages and web frameworks as well.

## Trick 1
The first trick is return the HTTP status code in the JSON result. E.g.
```
func handleRequest(ctx *gin.Context) {
    ctx.JSON(200, gin.H{
        "status": 200,
        // Other fields
    })
}
```

This seems a duplicate but is very handy because we don't have to look another place for the status code.

## Trick 2
The second trick is use string constants to indicate result status. E.g.
```
func handleRequest(ctx *gin.Context) {
    orderIDStr := ctx.Query("order_id")

    orderID, err := strconv.ParseUint(orderIDStr, 10, 64)

    if err != nil {
        ctx.JSON(400, gin.H{
            "status": 400,
            "code": "ARG_ERR",
            "code2": "order_id",
        })

        return;
    }
    
    dbConn, err := db.GetConn()

    if err != nil {
        ctx.JSON(500, gin.H{
            "status": 500,
            "code": "PROC_ERR",
            "code2": "GET_DB_CONN_ERR",
        })

        return
    }

    sqlStmt := "SELECT order_state FROM order WHERE order_id = ?"

    dbRow := dbConn.QueryRow(sqlStmt, orderID)

    var orderState uint8
    
    err = dbRow.Scan(&orderState)

    if err != nil {
        if err == sql.ErrNoRows {
            ctx.JSON(200, gin.H{
                "status": 200,
                "code": "FAILURE",
                "code2": "ORDER_NOT_EXISTS",
            })

            return
        }

        ctx.JSON(500, gin.H{
            "status": 500,
            "code": "PROC_ERR",
            "code2": "GET_ORDER_INFO_ERR",
        })

        return
    }
    
    ctx.JSON(200, gin.H{
        "status": 200,
        "code": "SUCCESS",
        "order_state": orderState,
    })
}
```

In the code above, "code" and "code2" fields are used to indicate result status.

"code" field is for general category, while "code2" is for detailed status in a general category. The division between general and detailed status is handy for handling in client code. If the client code does not care about the detailed status, it can check up the general status only.

For HTTP 400 response, the "code" value is "ARG_ERR", the "code2" value is the argument name. For HTTP 500 response, the "code" value is "PROC_ERR", the "code2" value is the various reasons why the processing failed. For HTTP 200 response, the "code" value is "SUCCESS" or "FAILURE", the "code2" value is the various reasons for a "FAILURE" result. If two code places have the same "code2", we can add a number postfix to each to make them unique. Because each "code2" is unique, it is very easy to locate the code place during debugging.

The use of string constants is preferred over number constants because, unlike well-defined HTTP status code, custom numbers are not as meaningful as strings. Plus when inserting new code in the middle, the numbers will be out-of-order, making it hard to find the next available number thereafter. Whereas string constants have no concern for ordering, and will be naturally unique for different statuses.
