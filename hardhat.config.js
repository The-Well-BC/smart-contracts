/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require("@nomiclabs/hardhat-waffle");

module.exports = {
    networks: {
        hardhat: {
            blockGasLimit: 0x1fffffffffffff,
            allowUnlimitedContractSize: true,
            gas: 12000000,
        },
        development: {
            url: "http://127.0.0.1:8545",
            chainId: 1337,
            blockGasLimit: 0x1fffffffffffff,
            allowUnlimitedContractSize: true,
            gas: 7000000,
        }
    },
    settings: {
        optimizer: {
            enabled: true,
            runs: 1
        }
    },
    solidity: "0.8.4",
};
