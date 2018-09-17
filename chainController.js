const Block = require("./Block")

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
  if (!data || !(typeof data === 'string' || data instanceof String)) {
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

module.exports = { getBlock, setBlock };
