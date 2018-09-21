const Block = require("./Block");
const WAValidator = require("wallet-address-validator");
const moment = require("moment");
const bitcoinMessage = require("bitcoinjs-message");

const VALIDATION_WINDOW_TIME = 300;

const getBlock = (req, res) => {
  let height = req.params.height;
  if (isNaN(height)) {
    return res.status(500).send("Invalid block height.");
  }
  req.chain
    .getBlock(height)
    .then(block => res.send(block))
    .catch(err => res.status(500).send("Unable to find requested block"));
};

const setBlock = (req, res) => {
  let data = req.body.body;
  if (!data || !(typeof data === "string" || data instanceof String)) {
    return res.status(500).send("Invalid data passed.");
  }
  req.chain.addBlock(new Block(data)).then(result => {
    if (result.success) {
      req.params.height = result.height;
      getBlock(req, res);
    } else {
      res.status(500).send("Error adding a new block.");
    }
  });
};
const requestValidation = (req, res) => {
  let blockchainID = req.body.address;
  if (
    !blockchainID ||
    !(typeof blockchainID === "string" || blockchainID instanceof String) ||
    !WAValidator.validate(blockchainID, "BTC")
  ) {
    return res
      .status(500)
      .send("Invalid data passed, please send a valid wallet address");
  }

  //check if same wallet already has a request
  let tStamp = moment().unix();
  let validationRequest = {
    address: blockchainID,
    requestTimeStamp: tStamp,
    message: `${blockchainID}:${tStamp}:starRegistry`,
    validationWindow: getValidationWindow(tStamp)
  };

  let pending = req.app.locals.userReqs.filter(
    uReq => uReq.address === blockchainID
  )[0];
  if (pending) {
    validationRequest = { ...pending };
    validationRequest.validationWindow = getValidationWindow(
      pending.requestTimeStamp
    );
  } else {
    req.app.locals.userReqs.push(validationRequest);
  }
  res.send(validationRequest);
};

const validateSignature = (req, res) => {
  let blockchainID = req.body.address;
  let signature = req.body.signature;
  if (
    !blockchainID ||
    !(typeof blockchainID === "string" || blockchainID instanceof String) ||
    !WAValidator.validate(blockchainID, "BTC")
  ) {
    return res
      .status(500)
      .send("Invalid data passed, please send a valid wallet address");
  }
  if (
    !signature ||
    !(typeof signature === "string" || signature instanceof String)
  ) {
    return res
      .status(500)
      .send("Invalid data passed, please send a valid signature");
  }

  //Prepare the answer
  let result = {
    registerStar: false,
    status: {
      address: null,
      requestTimeStamp: null,
      message: null,
      validationWindow: 0,
      messageSignature: 'invalid'
    }
  };
  //Look for existing user request

  let userRequest = req.app.locals.userReqs.filter(
    uReq => uReq.address === blockchainID
  )[0];
  if (userRequest) {
    let isValidSignature = bitcoinMessage.verify(
      userRequest.message,
      blockchainID,
      signature
    );
    result.registerStar = isValidSignature;
    result.status.address = userRequest.address;
    result.status.requestTimeStamp = userRequest.requestTimeStamp;
    result.status.message = userRequest.message;
    result.status.validationWindow = getValidationWindow(
      userRequest.requestTimeStamp
    );
    result.status.messageSignature = isValidSignature ? 'valid':'invalid';
  } else {
    result.status.address = blockchainID;
    result.status.message = "User request not found or expired";
    delete result.status.validationWindow;
    delete result.status.requestTimeStamp;
  }
  res.send(result);
};
const getValidationWindow = from => {
  return moment
    .unix(parseInt(from) + VALIDATION_WINDOW_TIME)
    .diff(moment(), "seconds");
};
module.exports = {
  getBlock,
  setBlock,
  requestValidation,
  getValidationWindow,
  validateSignature
};
