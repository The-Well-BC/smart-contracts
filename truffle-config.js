const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "1337"
        },
        test: {
            host: '127.0.0.1',
            port: 7545,
            network_id: 5777
        },
        /*
        develop: {
            network_id: 20,
            accounts: 5,
            defaultEtherBalance: 9000,
            blockTime: 3
        },
        */
        ropsten: {
            provider: function() {
                return new HDWalletProvider({
                    mnemonic: process.env.MNEMONIC,
                    providerOrUrl: process.env.INFURA_ROPSTEN_API_KEY
                })
            },
            network_id: 3,
            gas: 8000000,
            gasPrice: 100000000000
        }
    },

    plugins: [
        'truffle-plugin-verify'
    ],
    api_keys: {
        etherscan: process.env.ETHERSCAN_API_KEY
    },
    mocha: {
    // timeout: 100000
    },

    compilers: {
        solc: {
           version: "0.8.4",
        },
    },
};

