const chai = require('chai');
const { expect } = chai;

const { listNFTs, Bid } = require('./helpers');
let marketplace, theWellNFT, goodToken, badToken;
// let tokenID, tokenPrice = '30000000', creatorPercentage = 50;

let nftArr = [];

describe.skip('Test: NFT sales', function() {
    let buyers = [];

    before(async function() {
        return listNFTs()
            .then(res => {
                ({buyers, nftArr, TheWellMarketplace:marketplace, TheWellNFT:theWellNFT, goodToken, badToken} = res);
            });
    });

    it('Buyer should own NFT after purchase', function() {
        let buyer = buyers[0];
        let nft = nftArr[0];

        console.log('To buy token at price:', nft.price.toString(), 'WETH');
        return marketplace.connect(buyer).createBid(nft.id,
            Bid({bidder:buyer.address, amount:nft.price, token:goodToken }),
            buyer.address
        )
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
        let nft = nftArr[1];

        let bid = Bid({bidder:buyer.address, amount:wrongPrice, token:goodToken });
        console.log('BID:', bid);

        return expect(
            marketplace.connect(buyer).createBid(nft.id,
                bid,
                buyer.address
            )
        ).to.be.revertedWith('Wrong price');
    });

    it('Buyer should not be able to purchase NFT with a different currency than set', function() {
        let buyer = buyers[1];
        let nft = nftArr[1];

        return expect(
            marketplace.connect(buyer).createBid(nft.id,
                Bid({bidder:buyer.address, amount:nft.price, token:badToken.address }),
                buyer.address
            )
        ).to.be.revertedWith('Market: invalid purchase currency');
    });
});
