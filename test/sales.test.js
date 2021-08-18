const chai = require('chai');
const { expect } = chai;

const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const deploy = require('./deploy');
let marketplace, theWellNFT, weth, fresh;
let tokenID, tokenPrice = '30000000'; creatorPercentage = 50;

let nftArr = [];

describe.only('Test: NFT sales', function() {
    let accounts;

    // Deploy contracts and mint NFT in before()
    before(async function() {
        let deployed = await deploy();
        accounts = deployed.accounts;

        marketplace = deployed.marketplace;
        theWellNFT = deployed.nft;
        weth = deployed.weth;
        fresh = deployed.fresh;
    });

    describe('Buyer and Token', function() {
        let buyers = [];

        before(async function() {

            // Array of artists. Each test should use a different artist so we have a clean slate
            nftArr = [{
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
                nftArr.map(creators => {
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
                        nftArr[index].token = {
                            price: ethers.utils.parseEther(Math.random().toString()),
                            id: r.events.filter(log => log.event == 'Transfer')[0]
                            .args.tokenId.toString()
                        }
                    });

                    return Promise.all(
                        nftArr.map(nft => {
                            marketplace.connect(nft.artist).setPrice(nft.token.id, nft.token.price, weth.address)
                        })
                    );
                }).then(() => {
                    return Promise.all( nftArr.map(nft =>  
                        theWellNFT.connect(nft.artist).approve(marketplace.address, nft.token.id)
                    ));
                }).then(() => {
                    // setup buyers
                    buyers = [
                        accounts[1], accounts[2], accounts[3]
                    ];
                    const purchaseTokenBalance = ethers.utils.parseEther('4');

                    return Promise.all(
                        buyers.map(buyer => [
                            weth.connect(buyer).deposit({value:purchaseTokenBalance}),
                            fresh.mint(buyer.address, purchaseTokenBalance)
                        ]).flat()
                    ).then(() => {
                        return Promise.all(
                            buyers.map(buyer => [
                                weth.connect(buyer).approve(marketplace.address, purchaseTokenBalance),
                                fresh.connect(buyer).approve(marketplace.address, purchaseTokenBalance),
                            ]).flat()
                        );
                    });
                });
        });

        it('Buyer should own NFT after purchase', function() {
            let buyer = buyers[0];
            let nft = nftArr[0].token;

            return marketplace.connect(buyer).buyToken(nft.id, nft.price, weth.address)
                .then(res => res.wait())
                .then(res => {
                    return theWellNFT.connect(buyer).ownerOf(nft.id)
                }).then(res => {
                    expect(res).to.equal(buyer.address);
                });
        });

        it('Buyer should not be able to purchase NFT at a different price', function() {
            let buyer = buyers[1];
            let wrongPrice = '300000';
            let nft = nftArr[1].token;

            return expect(
                marketplace.connect(buyer).buyToken(nft.id, wrongPrice, weth.address)
            ).to.be.revertedWith('WellNFT: Wrong price');
        });

        it('Buyer should not be able to purchase NFT at a different currency than set', function() {
            let buyer = buyers[1];
            let nft = nftArr[1].token;

            return expect(
                marketplace.connect(buyer).buyToken(nft.id, nft.price, fresh.address)
            ).to.be.revertedWith('WellNFT: Wrong ERC20 token');
        });
    });
});
