const chai = require('chai');
const { expect } = chai;

const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const { listNFTs, Bid } = require('./helpers');

let marketplace, theWellNFT, goodToken, badToken;
let tokenID, tokenPrice = '30000000'; creatorPercentage = 50;

let nftArr = [];

describe('Test: NFT Auctions', function() {
    describe('Buyer and Token', function() {
        let buyers = [];

        before(async function() {
            return listNFTs()
            .then(res => {
                ({buyers, nftArr, TheWellMarketplace:marketplace, TheWellNFT:theWellNFT, goodToken, badToken} = res);
            });
        });

        it('Buyer should own NFT after passing in bid equal to ask amount', function() {
            let buyer = buyers[0];
            let nft = nftArr[0].token;
            let bid = {
                currency:goodToken,sellOnShare:{value:'25'},
                bidder:buyer.address,
                amount:nft.price.toString(),recipient:buyer.address
            };

            console.log('BUYER ADDRESS:', buyer.address, '\nWETH9 address:', goodToken);

            return marketplace.connect(buyer).createBid(nft.id, bid, buyer.address)
                .then(res => res.wait())
                .then(res => {
                    console.log('Bought token. Event:', res.events.filter(e => e.event == 'NumberLog'));
                    console.log('Bought token. Event:', res.events.filter(e => e.event == 'NumberLog')[0].args.value_.toString());
                    return theWellNFT.connect(buyer).ownerOf(nft.id)
                }).then(res => {
                    expect(res).to.equal(buyer.address);
                });
        });

        it('Buyer should not be able to purchase NFT at a different price', function() {
            let buyer = buyers[1];
            let wrongPrice = '300000';
            let nft = nftArr[1].token;

            let bid = {
                currency:goodToken,sellOnShare:{value:'25'},
                bidder:buyer.address,
                amount:wrongPrice,recipient:buyer.address
            };

            return expect(
                marketplace.connect(buyer).createBid(nft.id, bid, buyer.address)
            ).to.be.revertedWith('Wrong price');
        });

        it('Buyer should not be able to purchase NFT with a different currency than set', function() {
            let buyer = buyers[1];
            let nft = nftArr[1].token;

            return expect(
                marketplace.connect(buyer).buyToken(nft.id, nft.price, badToken.address)
            ).to.be.revertedWith('Market: invalid purchase currency');
        });
    });
});
