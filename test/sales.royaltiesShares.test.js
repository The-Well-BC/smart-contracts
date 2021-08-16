const chai = require('chai');
const { expect } = chai;

const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const { waffle, ethers } = require("hardhat");
const provider = waffle.provider;

const deploy = require('./deploy');
let theWellNFT, marketplace, weth;

let oneEth = '2000000000000000000';
let tokenID, tokenPrice = (parseInt(oneEth) / 6).toString();

describe('Test: NFT sales', function() {
    let accounts,
        artist, collaborators;

    const creatorsRoyalties =  50,
        artistPercentage = 65,
        collaboratorPercentages = [20, 10, 5];

    // Deploy contracts and mint NFT in before()
    before(async function() {
        let deployed = await deploy();
        accounts = deployed.accounts;

        weth = deployed.weth;
        marketplace = deployed.marketplace;
        theWellNFT = deployed.nft;
        payments = deployed.paymentSplitter;
    });

    describe('Creator/Collaborator Royalties', function() {
        before(async function() {
            // Array of artists. Each test should use a different artist so we have a clean slate
            artist = accounts[5];
            collaborators = [ accounts[2], accounts[3], accounts[4]];

            let buyer = accounts[1];

            return theWellNFT.connect(artist).mint(
                artistPercentage,
                collaborators.map(c => c.address),
                collaboratorPercentages,
                'Qmblah123.json',
                15, creatorsRoyalties, 35
            )
                .then(res => res.wait())
                .then(res => {
                    tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                        .args.tokenId.toString();

                    return Promise.all([
                        marketplace.connect(artist).setPrice(tokenID, tokenPrice),
                        weth.connect(buyer).deposit({ value: oneEth }),
                        weth.connect(buyer).approve(marketplace.address, tokenPrice),

                        weth.balanceOf(buyer.address)
                    ]);
                }).then(res => res.map(r => (r.wait) ? r.wait() : r))
                .then(async (res) => {
                    return marketplace.connect(buyer).buyToken(tokenID, tokenPrice, weth.address)
                        .then(res => res.wait())
                });
        });

        it(`Payment splitter should now have  ${ethers.utils.formatEther(((creatorsRoyalties/100) * tokenPrice).toString())} $FRESH tokens`, function() {
            console.log('CREATOR ROYALTIES IN PERCENTAGE:', creatorsRoyalties/100);
            console.log(' TOKEN PRICE:', tokenPrice);
            return weth.balanceOf(payments.address)
            .then(res => {
                expect(res.toString()).to.equal(
                    tokenPrice * (creatorsRoyalties/100)
                );
            });
        });

        it('Withdraw artist shares', function() {
            const artistShares = tokenPrice * (creatorsRoyalties/100) * (artistPercentage/100);

            // return payments.connect(artist).release(tokenID, artist.address, weth)
            return payments['release(uint256,address,address)'](tokenID, artist.address, weth.address)
                .then(res => res.wait())
                .then(res => {
                    return weth.balanceOf(artist.address);
                }).then(res => {
                    expect(res.toString()).to.equal(artistShares);
                });
        });
        it('Check collaborators\' shares', function() {
            const collaboratorShares = collaboratorPercentages.map(percent =>
                tokenPrice * (creatorsRoyalties/100) * (percent/100)
            );

            return Promise.all(
                collaborators.map(co => 
                    payments['release(uint256,address,address)'](tokenID, co.address, weth.address)
                )
            )
                .then(resArr => Promise.all(resArr.map(res => res.wait())))
                .then(() => {
                    return Promise.all(
                        collaborators.map(c => weth.balanceOf(c.address))
                    );
                })
                .then(res => {
                    console.log('Total collaborator shares', res);
                    expect(res.map(i => i.toString())).to.eql(collaboratorShares);
                });
        });
    });
});
