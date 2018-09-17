# MyPrivate Blockchain Project
That's my first private blockchain in action. All methods are Promise based or can be invoked with callback fn. Enjoy it!


## TL;DR
To get started developing right away:

* install all project dependencies with `npm install`
* start the blockchain webservice with `npm web`
* or
* start the chain and related tests with `npm start`

## What You're Getting
```bash
├── README.md - # This file.
├── chainController.js # all the business logic for managing blockchain from webservice
├── package.json # npm package manager file
├── index.js # a script with api invoke for test and chain initialization
├── levelSandbox.js # wrapper over LevelDB api
├── simpleChain.js # that's the core containing chain logic
└── web.js # web service entry point 
```

## Web framework used 
Express (http://www.expressjs.com)


## Endpoints
Use a software like postman or CURL to send the requests to the base url http://localhost:8000 with one of the below supported endpoints:

- GET
/block/{BLOCK_HEIGHT}

    Params: 
    + BLOCK_HEIGHT    Number value
    
    example:

```
curl http://localhost:8000/block/0
```


- POST
/block

    Params: 
    + BODY    json object with body param like {"body": "Test data"}

    example:

```
curl -X "POST" "http://localhost:8000/block" -H 'Content-Type: application/json' -d $'{"body":"block body contents"}'
```