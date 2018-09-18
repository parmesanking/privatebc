const app = require("express")();
const bodyParser = require("body-parser");
const http = require("http");
const chaintCTRL = require("./chainController");
const Blockchain = require("./simpleChain");
const moment = require("moment")
const LISTENPORT = process.env.PORT || 8000;
const blockchain = new Blockchain() 
let userReqs =[]
app.use(bodyParser.json({ limit: "50mb" }));

//Decorate all requests with blockchain and userRequests Buffer
app.use((req, res, next) => {
  req.chain = blockchain;
  req.userReqs = userReqs
  next()
});

app.route("/block/:height").get(chaintCTRL.getBlock);
app.route("/block").post(chaintCTRL.setBlock);
app.route("/yo").get((req, res) => {
  req.userReqs.push("Uella "+ moment().format())
res.json(req.userReqs)
})
http
  .createServer(app)
  .listen(LISTENPORT, () => console.log("Server listening on", LISTENPORT));
