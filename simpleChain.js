const SHA256 = require("crypto-js/sha256");
const DB = require("./levelSandbox");
const ReadWriteLock = require("rwlock");
const Block = require("./Block");

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain {
  constructor() {
    this.initialized = false;
    this.lock = new ReadWriteLock();
    this.getBlockHeight().then(height => {
      if (height === 0) {
        this.addBlock(
          new Block("First block in the chain - Genesis block")
        ).then(res => {
          if (res.success) {
            console.log("Genesis block added");
            this.initialized = true;
          }
        });
      } else {
        this.initialized = true;
      }
    });
  }

  get isReady() {
    return this.initialized;
  }
  set isReady(v) {
    throw new Error("This property is readonly");
  }

  /**
   * Add new block
   * Returns bool through promise or callback
   * @param {object} newBlock
   */
  addBlock(newBlock, callback = null) {
    let prom = new Promise((resolve, reject) => {
      // that fn must run one at once
      this.lock.writeLock(releaseLock => {
        this.getBlockHeight().then(height => {
          //Verify if blockchain is ready
          if (!this.initialized && height > 0) {
            releaseLock();
            console.error("Chain is not ready yet!");
            callback && callback({success:false, height: null});
            resolve({success:false, height: null});
          }

          // Block height
          newBlock.height = height;

          // previous block hash
          let prevBlockPromise = [];
          if (height > 0) {
            prevBlockPromise.push(
              this.getBlock(height - 1).then(prevBlock => {
                newBlock.previousBlockHash = prevBlock.hash;
              })
            );
          }
          Promise.all(prevBlockPromise).then(() => {
            // UTC timestamp
            newBlock.time = new Date()
              .getTime()
              .toString()
              .slice(0, -3);

            // Block hash with SHA256 using newBlock and converting to a string
            newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
            // Adding block object to chain
            //Storing new block into persistent DB
            DB.addDataToLevelDB(JSON.stringify(newBlock))
              .then(res => {
                releaseLock();
                callback && callback(res);
                resolve(res);
              })
              .catch(err => {
                console.err("Unable to add new block", err);
                releaseLock();
                callback && callback({success:false, height: null});
                resolve({success:false, height: null});
              });
          });
        });
      });
    });
    if (callback) {
      prom.then(block => console.log("New block:", block));
    } else {
      return prom;
    }
  }

  /**
   * Get block height
   * Returns int through promise or through callback
   */
  getBlockHeight(callback = null) {
    let prom = DB.getLastIndex()
      .then(i => {
        callback && callback(i);
        return i;
      })
      .catch(err => {
        console.error("Unable to get BlockHeight", err);
        callback && callback(false);
      });
    if (callback) {
      prom.then(i => {
        console.log("Block Height", i);
      });
    } else {
      return prom;
    }
  }

  /**
   * get block
   * Returns block object through promise or callback
   * @param {int} blockHeight
   */
  getBlock(blockHeight, callback = null) {
    if (!this.initialized) {
      console.error("Chain is not ready yet!");
      callback && callback(false);
    }
    // return object as a single string
    let prom = DB.getLevelDBData(blockHeight).then(block => {
      let blk = JSON.parse(block);
      callback && callback(blk);
      return blk;
    });

    if (callback) {
      prom.then(block => console.log("Block:", block));
    } else {
      //Return promisified block
      return prom;
    }
  }

  //Returns bool through promise
  /**
   * Validate a block of the chain
   * Returns bool through promise or callback
   * @param {int} blockHeight
   */
  validateBlock(blockHeight, callback = null) {
    let prom = this.getBlock(blockHeight).then(block => {
      // got block object
      // get block hash
      let blockHash = block.hash;
      // remove block hash to test block integrity
      block.hash = "";
      // generate block hash
      let validBlockHash = SHA256(JSON.stringify(block)).toString();
      // Compare
      if (blockHash === validBlockHash) {
        callback && callback(true);
        return true;
      } else {
        console.log(
          "Block #" +
            blockHeight +
            " invalid hash:\n" +
            blockHash +
            "<>" +
            validBlockHash
        );
        callback && callback(false);
        return false;
      }
    });

    if (callback) {
      prom.then(res => console.log("Block valid?", res));
    } else {
      return prom;
    }
  }

  /**
   * Validate entire  blockchain [every block + block links]
   * Returns bool through promise or callback
   */
  validateChain(callback = null) {
    let prom = new Promise((resolve, reject) => {
      let errorLog = [];
      //Count all blocks in chain
      this.getBlockHeight().then(height => {
        let validations = [];
        //Loop through blocks
        for (var i = 0; i < height; i++) {
          // validate single
          validations.push(
            this.getBlock(i).then(block => {
              return this.validateBlock(block.height).then(result => {
                !result && errorLog.push(block.height);
                return result;
              });
            })
          );

          // compare blocks hash link
          if (i > 0) {
            validations.push(
              this.getBlock(i).then(block => {
                return this.getBlock(block.height - 1).then(prevBlock => {
                  if (prevBlock.hash !== block.previousBlockHash) {
                    errorLog.push(block.height);
                    return false;
                  }
                  return true;
                });
              })
            );
          }
        }
        Promise.all(validations).then(res => {
          //console.log("VALIDATIONS", res)
          if (errorLog.length > 0) {
            console.log("Block errors = " + errorLog.length);
            console.log("Blocks: " + errorLog);
          }
          callback && callback(errorLog.length === 0);
          return resolve(errorLog.length === 0);
        });
      });
    });

    if (callback) {
      prom.then(res => console.log("Chain valid?", res));
    } else {
      return prom;
    }
  }
}

module.exports = Blockchain;
