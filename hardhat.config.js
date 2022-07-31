/**
 * @type import('hardhat/config').HardhatUserConfig
 */

// require('hardhat-contract-sizer');
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
// require("hardhat-gas-reporter");

// Tasks
require('./tasks');

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
            url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
            accounts: [ `0x${ process.env.PRIVATE_KEY }` ],
            chainId: 3,
            networkCheckTimeout: 100000,
        },
        mainnet: {
            url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
            accounts: [ `0x${ process.env.PRIVATE_KEY }` ],
            chainId: 1,
            networkCheckTimeout: 100000,
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
    /*
    gasReporter: {
        enabled: (process.env.REPORT_GAS === false) ? false : true,
        currency: 'USD',
        gasPrice: 21
    },
    */
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
                    runs: 223
                }
            },
        }, {
            version: "0.8.9",
        }, {
            version: "0.4.20"
        }]
    }
};
