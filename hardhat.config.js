/**
 * @type import('hardhat/config').HardhatUserConfig
 */

require('hardhat-contract-sizer');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");

// Tasks
require('./tasks/deploy');

module.exports = {
    networks: {
        hardhat: {
            blockGasLimit: 0x1fffffffffffff,
            allowUnlimitedContractSize: true,
            gas: 12000000,
            accounts: {
                count: 20
            }
        },
        development: {
            url: "http://127.0.0.1:8545",
            chainId: 1337,
            blockGasLimit: 0x1fffffffffffff,
            allowUnlimitedContractSize: true,
            gas: 7000000,
        },
        ropsten: {
            url: process.env.INFURA_ROPSTEN_API_KEY,
            accounts: [ `0x${ process.env.PRIVATE_KEY }` ],
            chainId: 3,
            networkCheckTimeout: 100000,
            gas: 8000000,
            gasPrice: 100000000000
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY
    },
    contractSizer: {
        alphaSort: true,
        runOnCompile: true,
        disambiguatePaths: false,
    },
    gasReporter: {
        currency: 'CHF',
        gasPrice: 21
    },
    settings: {
        optimizer: {
            enabled: true,
            runs: 1
        }
    },
    solidity: {
        compilers: [{
            version: "0.8.4",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 201
                }
            },
        }, {
            version: "0.4.18",
            settings: {
                optimizer: {
                    enabled: true,
                    runs: 201
                }
            },
        }]
    }
};
