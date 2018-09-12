/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require("crypto-js/sha256");
const DB = require("./levelSandbox");
const ReadWriteLock = require("rwlock");
/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/
class Block {
  constructor(data) {
    (this.hash = ""),
      (this.height = 0),
      (this.body = data),
      (this.time = 0),
      (this.previousBlockHash = "");
  }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class Blockchain {
  constructor() {
    this.initialized = false;
    this.lock = new ReadWriteLock();
  }

  /**
   * It loads the chain adding genesys block if necessary
   * Returns bool through promise
   */
  initialize() {
    //Verify for genesys block
    return this.getBlockHeight().then(height => {
      if (height === 0) {
        return this.addBlock(
          new Block("First block in the chain - Genesis block")
        ).then(res => {
          if (res) {
            this.initialized = true;
          }
          return res;
        });
      } else {
        this.initialized = true;
        return true;
      }
    });
  }

  /**
   * Add new block
   * Returns bool through promise 
   * @param {object} newBlock 
   */
  addBlock(newBlock) {
    // that fn must run one at once
    return new Promise((resolve, reject) => {
      this.lock.writeLock(releaseLock => {
        this.getBlockHeight().then(height => {
          //Verify if blockchain is ready
          if (!this.initialized && height > 0) {
            releaseLock();
            return reject();
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
                resolve(res);
              })
              .catch(err => {
                console.err("Unable to add new block", err);
                releaseLock();
                reject();
              });
          });
        });
      });
    });
  }

  /**
   * Get block height
   * Returns int through promise
   */
  getBlockHeight() {
    return DB.getLastIndex().then(i => i);
  }

  /**
   * get block
   * Returns block object through promise
   * @param {int} blockHeight
   */
  getBlock(blockHeight) {
    if (!this.initialized) {
      return Promise.reject("Chain not ready yet!");
    }
    // return object as a single string
    return DB.getLevelDBData(blockHeight).then(block => {
      return JSON.parse(block);
    });
  }

  //Returns bool through promise
  /**
   * Validate a block of the chain
   * Returns bool through promise
   * @param {int} blockHeight 
   */
  validateBlock(blockHeight) {
    return this.getBlock(blockHeight).then(block => {
      // got block object
      // get block hash
      let blockHash = block.hash;
      // remove block hash to test block integrity
      block.hash = "";
      // generate block hash
      let validBlockHash = SHA256(JSON.stringify(block)).toString();
      // Compare
      if (blockHash === validBlockHash) {
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
        return false;
      }
    });
  }
  
  /**
   * Validate entire  blockchain [every block + block links]
   * Returns bool through promise
   */
  validateChain() {
    return new Promise((resolve, reject) => {
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
          return resolve(errorLog.length === 0);
        });
      });
    });
  }
}

module.exports = { Block, Blockchain };
