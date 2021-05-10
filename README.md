# WELL and $fresh tokens

## Testing
- If you have ganache-cli installed, run `npm run test-chain` in one terminal window.
- Open another terminal and run `npm run test:contracts`

### Testing in Browser
- Run `npm run dev-chain` in a terminal window to start the development blockchain.
- Then run `truffle migrate` to migrate the contracts onto the development blockchain.
- Setup a new browser profile and install Metamask. Setup the wallet with the seed phrase below
```
much lend accuse door
can mixture original orient
journey spice afraid wire
```
- Add the local blockchain (chain id = 1337, http://127.0.0.1:8545)
