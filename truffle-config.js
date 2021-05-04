const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",
            port: 8545,
            network_id: "5777"
        },
        ropsten: {
            provider: function() {
                return new HDWalletProvider({
                    mnemonic: process.env.MNEMONIC,
                    providerOrUrl: `https://ropsten.infura.io/v3/${ process.env.INFURA_ROPSTEN_API_KEY }`
                })
            },
            network_id: 3,
            gas: 8000000,
            gasPrice: 100000000000
        }
    },

    mocha: {
    // timeout: 100000
    },

    compilers: {
        solc: {
           version: "0.8.0",
        },
    },
};

