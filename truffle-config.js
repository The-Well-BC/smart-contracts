const HDWalletProvider = require('@truffle/hdwallet-provider');

console.log('wallet keys:', {
    mnemonic: process.env.MNEMONIC,
    providerOrUrl: process.env.INFURA_ROPSTEN_API_KEY
})
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
            networkCheckTimeout: 100000,
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

  // Configure your compilers
    compilers: {
        solc: {
           version: "0.8.4",    // Fetch exact version from solc-bin (default: truffle's version)
          // docker: true,        // Use "0.5.1" you've installed locally with docker (default: false)
          // settings: {          // See the solidity docs for advice about optimization and evmVersion
          //  optimizer: {
          //    enabled: false,
          //    runs: 200
          //  },
          //  evmVersion: "byzantium"
          // }
        },
    },
};
