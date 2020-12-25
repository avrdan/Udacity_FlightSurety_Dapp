const HDWalletProvider = require("@truffle/hdwallet-provider");
//var mnemonic = "candy maple cake sugar pudding cream honey rich smooth crumble sweet treat";
//var mnemonic = "tourist maze clog punch destroy excuse noise unfair utility minute market opinion";
var mnemonic = "digital phone bag since rhythm estate category brass royal enlist march alter";

module.exports = {
  networks: {
    development: {
      provider: function() {
        return new HDWalletProvider(mnemonic, "http://127.0.0.1:7545/", 0, 50);
      },
      network_id: '*',
      //gas: 9999999
    }
  },
  compilers: {
    solc: {
      version: "^0.4.24"
    }
  }
};