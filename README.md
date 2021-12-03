# Smart contracts for TheWell
## Contracts
[![Tests](https://github.com/The-Well-BC/smart-contracts/actions/workflows/tests.yml/badge.svg)](https://github.com/The-Well-BC/smart-contracts/actions/workflows/tests.yml)

* Note: Make sure you create a .env.local file to use when deploying contracts onto the testnets. Open the .env.local.sample file and use that to create your .env.local file.

`npm run ropsten:migrate` deploys the contracts to the Ropsten testnet network.

## Testing
- Run `npm run test` in your terminal.

## Deploying on local blockchain
You need [ganache-cli](https://github.com/trufflesuite/ganache-cli) installed.

Run the following in a terminal window.
```
ganache-cli --defaultBalanceEther -h 0.0.0.0 -i 1337
```
followed by
```
npm run dev
```
