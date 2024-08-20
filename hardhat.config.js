require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.3",
      },
      {
        version: "0.8.14",
      },
      {
        version: "0.8.24",
      }
    ],
  },
  mocha: {
    timeout: 100000000,
  },
};
