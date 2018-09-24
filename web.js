const app = require("express")();
const bodyParser = require("body-parser");
const http = require("http");
const chaintCTRL = require("./chainController");
const Blockchain = require("./simpleChain");
const moment = require("moment");
const LISTENPORT = process.env.PORT || 8000;
const blockchain = new Blockchain();

app.use(bodyParser.json({ limit: "50mb" }));

//Clean expired validation request (it runs on top of all requests)
app.use((req, res, next) => {
  app.locals.userReqs = (app.locals.userReqs ||[]).filter(
    uReq => chaintCTRL.getValidationWindow(uReq.requestTimeStamp) > 0
  );
  next();
});

//Decorate all requests with blockchain
app.use((req, res, next) => {
  req.chain = blockchain;
  next();
});



app.route("/block/:height").get(chaintCTRL.getBlock);
//app.route("/block").post(chaintCTRL.setBlock);
app.route("/block").post(chaintCTRL.addStar);
app.route("/requestValidation").post(chaintCTRL.requestValidation);
app.route("/message-signature/validate").post(chaintCTRL.validateSignature)
app.route("/stars/:query").get(chaintCTRL.getStars)
http
  .createServer(app)
  .listen(LISTENPORT, () => console.log("Server listening on", LISTENPORT));
