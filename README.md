# Smart contracts for TheWell
## Contracts
[![Tests](https://github.com/The-Well-BC/smart-contracts/actions/workflows/tests.yml/badge.svg)](https://github.com/The-Well-BC/smart-contracts/actions/workflows/tests.yml)

* Note: Make sure you create a .env.local file to use when deploying contracts onto the testnets. Open the .env.local.sample file and use that to create your .env.local file.

`npm run ropsten:migrate` deploys the contracts to the Ropsten testnet network.

## Testing
- If you have ganache-cli installed, run `npm run test-chain` in one terminal window.
- Open another terminal and run `npm run test:contracts`

### Testing in Browser
- Run `npm run dev-chain` in a terminal window to start the development blockchain.
- Then run `truffle migrate` to migrate the contracts onto the development blockchain.

- Add the local blockchain (chain id = 1337, http://127.0.0.1:8545)
