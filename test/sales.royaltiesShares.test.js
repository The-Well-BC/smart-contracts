const chai = require('chai');
const { expect } = chai;

const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const { waffle, ethers } = require("hardhat");
const provider = waffle.provider;

const deploy = require('./deploy');
let theWellNFT, marketplace, goodToken;

let oneEth = '2000000000000000000';
let tokenID, tokenPrice = '30000000';
const { listNFT, Bid } = require('./helpers');

describe('Test: Royalties from NFT sales', function() {
    let accounts,
        artist, collaborators;

    const creatorsRoyalties =  50,
        artistPercentage = 65,
        collaboratorPercentages = [20, 10, 5];

    before(async function() {
        return listNFT()
            .then(res => {
                ({nft, TheWellMarketplace:marketplace, TheWellNFT:theWellNFT, goodToken, badToken} = res);

                ({ artist, collaborators } = nft);
            });
    });

    describe('Creator/Collaborator Royalties', function() {

        it(`Payment splitter should now have  ${ethers.utils.formatEther(((creatorsRoyalties/100) * tokenPrice).toString())} $FRESH tokens`, function() {
            console.log('CREATOR ROYALTIES IN PERCENTAGE:', creatorsRoyalties/100);
            console.log(' TOKEN PRICE:', tokenPrice);
            return goodToken.balanceOf(payments.address)
            .then(res => {
                expect(parseInt(res.toString())).to.equal(
                    tokenPrice * (creatorsRoyalties/100)
                );
            });
        });

        it('Withdraw artist shares', function() {
            const artistShares = tokenPrice * (creatorsRoyalties/100) * (artistPercentage/100);

            // return payments.connect(artist).release(tokenID, artist.address, goodToken)
            return payments['release(uint256,address,address)'](tokenID, artist.address, goodToken.address)
                .then(res => res.wait())
                .then(res => {
                    return goodToken.balanceOf(artist.address);
                }).then(res => {
                    expect(parseInt(res.toString())).to.equal(artistShares);
                });
        });
        it('Check collaborators\' shares', function() {
            const collaboratorShares = collaboratorPercentages.map(percent =>
                tokenPrice * (creatorsRoyalties/100) * (percent/100)
            );

            return Promise.all(
                collaborators.map(co => 
                    payments['release(uint256,address,address)'](tokenID, co.address, goodToken.address)
                )
            )
                .then(resArr => Promise.all(resArr.map(res => res.wait())))
                .then(() => {
                    return Promise.all(
                        collaborators.map(c => goodToken.balanceOf(c.address))
                    );
                })
                .then(res => {
                    console.log('Total collaborator shares', res);
                    expect(res.map(i => parseInt(i.toString()))).to.eql(collaboratorShares);
                });
        });

        it('Fail on non-collaborator withdraw');

        it('Creators/Collaborators withdrawals should be limited to sales from their NFTs');
    });
});
