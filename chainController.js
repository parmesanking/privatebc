const Block = require("./Block");
const WAValidator = require("wallet-address-validator");
const moment = require("moment");
const bitcoinMessage = require("bitcoinjs-message");

const VALIDATION_WINDOW_TIME = 300;
/**
 * Retrieve a chain block by passing block height
 */
const getBlock = (req, res) => {
  let height = req.params.height;
  if (isNaN(height)) {
    if (res) {
      res.status(500).send("Invalid block height");
    } else {
      throw new Error("Invalid block height");
    }
  }
  return req.chain
    .getBlock(height)
    .then(block => (res ? res.send(block) : block))
    .catch(err => {
      if (res) {
        res.status(500).send("Unable to find requested block");
      } else {
        throw new Error("Unable to find requested block");
      }
    });
};

/**
 * Add a new block in the chain
 */
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

/**
 * Set or get an existing user validation request for message signing
 */
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

  //prepare answer
  let tStamp = moment().unix();
  let validationRequest = {
    address: blockchainID,
    requestTimeStamp: tStamp,
    message: `${blockchainID}:${tStamp}:starRegistry`,
    validationWindow: getValidationWindow(tStamp)
  };

  //check if same wallet already has a request
  let pending = req.app.locals.userReqs.filter(
    uReq => uReq.address === blockchainID
  )[0];
  if (pending) {
    validationRequest = { ...pending };
    validationRequest.validationWindow = getValidationWindow(
      pending.requestTimeStamp
    );
  } else {
    //append new request to in memory db
    req.app.locals.userReqs.push(validationRequest);
  }
  //send the answer
  res.send(validationRequest);
};
/**
 * Sign a message from a stored user validation request
 */
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
      messageSignature: "invalid"
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
    result.status.messageSignature = isValidSignature ? "valid" : "invalid";
  } else {
    result.status.address = blockchainID;
    result.status.message = "User request not found or expired";
    delete result.status.validationWindow;
    delete result.status.requestTimeStamp;
  }
  //Send the answer
  res.send(result);
};
/**
 * Register a new star ownership into chain
 */
const addStar = (req, res) => {
  let address = req.body.address;
  let star = req.body.star || {};
  star.story = star.story || "";
  star.mag = star.mag || "";
  star.constellation = star.constellation || "";

  if (!address || !(typeof address === "string" || address instanceof String)) {
    return res.status(500).send("Invalid address passed.");
  }

  if (!star.ra || !(typeof star.ra === "string" || star.ra instanceof String)) {
    return res.status(500).send("Invalid right ascension passed.");
  }

  if (
    !star.dec ||
    !(typeof star.dec === "string" || star.dec instanceof String)
  ) {
    return res.status(500).send("Invalid declination passed.");
  }

  if (star.story.length > 250) {
    return res.status(500).send("Too long star story, please reduce it.");
  }

  //Look for existing user request
  let userRequest = req.app.locals.userReqs.filter(
    uReq => uReq.address === address
  )[0];
  if (!userRequest) {
    return res
      .status(500)
      .send("That address is not allowed to register stars");
  }

  star.story = a2hex(star.story);
  !star.mag && delete star.mag;
  !star.constellation && delete star.constellation;

  //data has been validate, proceed with block add
  req.chain.addBlock(new Block({ address, star })).then(result => {
    if (result.success) {
      req.params.height = result.height;
      //Remove user request from queue
      req.app.locals.userReqs = (req.app.locals.userReqs || []).filter(
        uReq => uReq.address !== address
      );
      getBlock(req, res);
    } else {
      res.status(500).send("Error adding a new block.");
    }
  });
};
/**
 * Retrieve registered stars using given query
 */
const getStars = (req, res) => {
  let query = (req.params.query || "").split(":");
  if (query.length !== 2) {
    return res.status(500).send("Invalid query");
  }
  query[0] = query[0].toLowerCase();

  if (query[0] === "height") {
    req.params.height = query[1];
    getBlock(req).then(block => {
      if (block.body.star && block.body.star.story) {
        block.body.star.storyDecoded = hex2a(block.body.star.story);
      }
      res.send(block)
    });
  } else if (query[0] === "address" || query[0] === "hash") {
    req.chain.getBlockHeight().then(height => {
      let ope = [];
      let stars = [];
      for (let i = 0; i < height; i++) {
        ope.push(
          req.chain.getBlock(i).then(block => {
            if (query[0] === "hash" && block.hash === query[1]) {
              stars.push(block);
            } else if (
              query[0] === "address" &&
              (block.body || []).address &&
              block.body.address === query[1]
            ) {
              stars.push(block);
            }
          })
        );
      }
      Promise.all(ope)
        .then(result => {
          stars.map(block => {
            if (block.body.star && block.body.star.story) {
              block.body.star.storyDecoded = hex2a(block.body.star.story);
            }
          });

          //send the answer
          res.send(stars);
        })
        .catch(err => res.status(500).send("Error retrieving blocks"));
    });
  }
};

const getValidationWindow = from => {
  return moment
    .unix(parseInt(from) + VALIDATION_WINDOW_TIME)
    .diff(moment(), "seconds");
};

const a2hex = str => {
  let arr = [];
  for (let i = 0, l = str.length; i < l; i++) {
    let hex = Number(str.charCodeAt(i)).toString(16);
    arr.push(hex);
  }
  return arr.join("");
};

const hex2a = hexx => {
  let hex = hexx.toString(); //force conversion
  let str = "";
  for (let i = 0; i < hex.length && hex.substr(i, 2) !== "00"; i += 2)
    str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
  return str;
};

module.exports = {
  getBlock,
  setBlock,
  requestValidation,
  getValidationWindow,
  validateSignature,
  addStar,
  getStars
};
