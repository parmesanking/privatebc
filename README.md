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

- Validate user request for message signing
  
POST /requestValidation

Address must be a valid BITCOIN address

    Params: 
    + BODY    json object with body param like {"address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ" }

    example:

```
curl -X "POST" "http://localhost:8000/requestValidation" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
  "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ"
}'
```

- Validate user message signing
  
POST /message-signature/validate

Simulation can be done signing a message with Electrum tool (www.electrum.org)

    Params: 
    + BODY    json object with body param like {"address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ", "signature":"XYZ..." }

    example:

```
curl -X "POST" "http://localhost:8000/message-signature/validate" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
  "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",
  "signature": "H6ZrGrF0Y4rMGBMRT2+hHWGbThTIyhBS0dNKQRov9Yg6GgXcHxtO9GJN4nwD2yNXpnXHTWU9i+qdw5vpsooryLU="
}'
```

- Star Registration Endpoint
  
POST /block

    Params: 
    + BODY    json object with body param like 
                {
                "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",
                "star": {
                "dec": "-26° 29' 24.9",
                "ra": "16h 29m 1.0s",
                "story": "Found star using https://www.google.com/sky/"
                }

    example:

```
curl -X "POST" "http://localhost:8000/block" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
  "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",
  "star": {
    "dec": "-26° 29'\'' 24.9",
    "ra": "16h 29m 1.0s",
    "story": "Found star using https://www.google.com/sky/"
  }
}'
```


- Star Lookup Endpoints
  
GET /stars/height:[HEIGHT]

GET /stars/address:[ADDRESS]

GET /stars/hash:[HASH]

    example:

```
curl "http://localhost:8000/stars/address:142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ"
```