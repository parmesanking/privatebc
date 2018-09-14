const Block = require("./Block");
const Blockchain = require("./simpleChain");
const db = require("./levelSandbox");
let blockchain = new Blockchain();

//Wait for 1 sec for blockchain to be loaded
setTimeout(() => {
  if (blockchain.isReady) {
    //5: Generate 10 blocks using a for loop
    for (var i = 0; i <= 10; i++) {
      blockchain.addBlock(new Block("test data " + i), res => {
        console.log("Added block", res);
      });
    }

    //6: Validate blockchain
    setTimeout(() => {
      blockchain.validateChain(res => {
        console.log("CHAIN VALID?", res);
      });
    }, 3000);

    //7: Induce errors by changing block data
    setTimeout(() => {
      let inducedErrorBlocks = [2, 4, 7];
      for (var i = 0; i < inducedErrorBlocks.length; i++) {
        blockchain.getBlock(inducedErrorBlocks[i], block => {
          block.data = "induced chain error";
          db.addLevelDBData(block.height, JSON.stringify(block));
        });
      }
    }, 5000);

    //8: Validate blockchain. The chain should now fail with blocks 2,4, and 7.
    setTimeout(() => {
      blockchain.validateChain(res => {
        console.log("CHAIN VALID?", res);
      });
    }, 7000);
  } else {
    console.error("Blockchain is not ready yet");
  }
}, 3000);
