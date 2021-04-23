// const { assert } = require("console");
const chai = require('chai');
chai.use(
    require('chai-as-promised')
);
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const ShopFrontContract = artifacts.require('NFTShopFront');

contract.only('Pay into collaborator accounts on contract', function (accounts) {
    let a = accounts;
    let artist = a[0],
        artistCut = 55;

    const tokenID = 12,
        tokenPrice = 0.04,
        tokenPriceInWEI = web3.utils.toWei(tokenPrice.toString(), "ether");

    let collaborators = [
        { address: a[1], reward: 5 },
        { address: a[2], reward: 25 },
        { address: a[3], reward: 5 },
        { address: a[4], reward: 10 }
    ];

    let collabNFT, contractAddress;

    before(function() {
        return ShopFrontContract.new(
            artist, artistCut,
            collaborators.map(c => c.address),
            collaborators.map(c => c.reward),
            'https://boom.com/${id}'
        ).then(res => {
            collabNFT = res;
            contractAddress = collabNFT.address;

            // Set price for token we'll be purchasing
            return collabNFT.setPrice(tokenID, tokenPriceInWEI);
        });
    });

    it('Buying NFT should increase collaborators\' balance in contract', function() {
        return collabNFT.receiveEthAndMint(tokenID, 1, {from: accounts[9], value: tokenPriceInWEI})
        .then(res => {
            return Promise.all(collaborators.map(c => {
                return collabNFT.getCollaborator(c.address);
            }));
        }).then(details => {
            details.forEach( c => {
                const share = c['1'].toNumber(),
                    balance = c['2'];

                expect(balance.toString()).to.equal((tokenPriceInWEI * (share/100)).toString());
            });
        });
    });
});
