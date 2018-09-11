const chainUtil = require("./simpleChain");
const db = require("./levelSandbox");
let blockchain = new chainUtil.Blockchain();

//TEST FLOW
//Load blockchain
blockchain.initialize().then(res => {
  console.log("READY?", res);
  // Get the highest block
  blockchain.getBlockHeight().then(height => {
    console.log("BEST BLOCK", height);

    // in case of no blocks let's add some
    let ope = [];
    if (height === 1) {
      for (let a = 0; a < 10; a++) {
        ope.push(blockchain.addBlock(new chainUtil.Block("Test data")));
      }
    }
    Promise.all(ope).then(res => {
      console.log("ADDED TEST BLOCK?", ope.length > 0 && res.every(el => el));
      ope = [];
      //Validate Block #3
      ope.push(
        blockchain.validateBlock(3).then(res => {
          console.log("Is Valid Block?", res);
          return res;
        })
      );

      //Validate Block #8
      ope.push(
        blockchain.validateBlock(8).then(res => {
          console.log("Is Valid Block?", res);
          return res;
        })
      );

      // now validate entire chain
      ope.push(
        blockchain.validateChain().then(res => {
          console.log("Is Valid Chain?", res);
          return res;
        })
      );
      Promise.all(ope).then(res => {
        console.log("IS EVERYTHING VALID?", res.every(el => el));

        //Now alter the chain with invalid blocks
        ope = [];
        ope.push(
          blockchain.getBlock(4).then(block => {
            block.body = "Invalid data";

            return db.addLevelDBData(4, JSON.stringify(block));
          })
        );
        ope.push(
          blockchain.getBlock(7).then(block => {
            block.body = "Invalid data";

            return db.addLevelDBData(7, JSON.stringify(block));
          })
        );

        //Now check the chain validity again
        //Validate Block #4
        ope.push(
          blockchain.validateBlock(4).then(res => {
            console.log("Is Valid Block?", res);
            return res;
          })
        );
        //Validate Block #7
        ope.push(
          blockchain.validateBlock(7).then(res => {
            console.log("Is Valid Block?", res);
            return res;
          })
        );

        // now validate entire chain
        ope.push(
          blockchain.validateChain().then(res => {
            console.log("Is Valid Chain?", res);
            return res;
          })
        );
        Promise.all(ope).then(res => {
          console.log("all done!");
        });
      });
    });
  });
});
