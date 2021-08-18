const chai = require('chai');
const { expect } = chai;

const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const deploy = require('./deploy');
let marketplace, theWellNFT;
let tokenIDs, tokenPrice = '30000000';

describe('Error Testing: NFT sales', function() {
    let accounts;

    // Deploy contracts and mint NFT in before()
    before(async function() {
        let deployed = await deploy();
        accounts = deployed.accounts;

        marketplace = deployed.marketplace;
        theWellNFT = deployed.nft;
    });

    describe('Creator/Collaborator Royalties with multiple NFT sales', function() {

        before(async function() {
            // Array of artists. Each test should use a different artist so we have a clean slate
            const creatorArr = [{
                artist: accounts[5],
                collaborators: [ accounts[3], accounts[4], accounts[8]],
            }, {
                artist: accounts[6],
                collaborators: [ accounts[9], accounts[10], accounts[11]],
            }, {
                artist: accounts[7],
                collaborators: [ accounts[12], accounts[13], accounts[14]],
            }];

            const creatorsRoyalties =  50;

            return Promise.all(
                creatorArr.map(creators => {
                    return theWellNFT.connect(creators.artist).mint(
                        65,
                        creators.collaborators.map(c => c.address),
                        [20, 10, 5],
                        'Qmblah123.json',
                        15, 35, creatorsRoyalties
                    )
                })
            )
                .then(res => Promise.all(res.map(re => re.wait())))
                .then(res => {
                    res.forEach((r, index) => {
                        creatorArr[index].tokenIDs = [];

                        creatorArr[index].tokenIDs.push(
                            r.events.filter(log => log.event == 'Transfer')[0]
                                .args.tokenId.toString()
                        );
                    });

                    return Promise.all( creatorArr.map(creators => 
                        marketplace.connect(creators.artist).setPrice(creators.tokenIDs[0], tokenPrice)
                    ));
                }).then(() => {
                    return Promise.all( creatorArr.map(creators => 
                        theWellNFT.connect(creators.artist).approve(marketplace.address, creators.tokenIDs[0])
                    ));
                });
        });

        it('Fail on non-collaborator withdraw');

        it('Creators/Collaborators withdrawals should be limited to sales from their NFTs');
    });

});
