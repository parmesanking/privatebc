const app = require("express")();
const bodyParser = require("body-parser");
const http = require("http");
const chaintCTRL = require("./chainController");
const Blockchain = require("./simpleChain");

const LISTENPORT = process.env.PORT || 8000;
const blockchain = new Blockchain() 
app.use(bodyParser.json({ limit: "50mb" }));

//Decorate all requests with blockchain
app.use((req, res, next) => {
  req.chain = blockchain;
  next()
});

app.route("/block/:height").get(chaintCTRL.getBlock);
app.route("/block").post(chaintCTRL.setBlock);

http
  .createServer(app)
  .listen(LISTENPORT, () => console.log("Server listening on", LISTENPORT));
