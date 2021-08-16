const chai = require('chai');
const { expect } = chai;

const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const deploy = require('./deploy');
let marketplace, theWellNFT, fresh;
let tokenID, tokenPrice = '30000000';

describe('Test: NFT sales', function() {
    let accounts;

    // Deploy contracts and mint NFT in before()
    before(async function() {
        let deployed = await deploy();
        accounts = deployed.accounts;

        marketplace = deployed.marketplace;
        theWellNFT = deployed.nft;
        fresh = deployed.fresh;
    });

    describe('Buyer and Token', function() {
        before(async function() {

            // Array of artists. Each test should use a different artist so we have a clean slate
            const artistWallet = accounts[5];

            return theWellNFT.connect(artistWallet).mint(
                65,
                [ accounts[2], accounts[3], accounts[4]].map(c => c.address),
                [20, 10, 5],
                'Qmblah123.json',
                15, 25, 60
            )
                .then(res => res.wait())
                .then(res => {
                    tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                        .args.tokenId.toString();

                    return marketplace.connect(artistWallet).setPrice(tokenID, tokenPrice);
                }).then(() => {
                    return theWellNFT.connect(artistWallet).approve(marketplace.address, tokenID);
                });
        });
        it('Buyer should own NFT after purchase', function() {
            let buyer = accounts[0];

            return marketplace.connect(buyer).buyToken(tokenID, tokenPrice, fresh.address)
                .then(res => res.wait())
                .then(res => {
                    return theWellNFT.connect(buyer).ownerOf(tokenID)
                }).then(res => {
                    expect(res).to.equal(buyer.address);
                });
        });
    });
});
