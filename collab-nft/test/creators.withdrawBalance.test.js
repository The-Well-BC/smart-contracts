// const { assert } = require("console");
const chai = require('chai');
chai.use(
    require('chai-as-promised')
);
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const ShopFrontContract = artifacts.require('NFTShopFront');

contract.only('Withdraw balances', function (accounts) {
    let a = accounts;
    let artist = a[0],
        artistCut = 55;

    const tokenID = 12,
        tokenPriceInWEI = web3.utils.toWei('10', "ether");

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
            return collabNFT.setPrice(tokenID, tokenPriceInWEI)
            .then(() => collabNFT.receiveEthAndMint(tokenID, 1, {from: accounts[9], value: tokenPriceInWEI}))
            .then(res => {
                return Promise.all(collaborators.map(c => {
                    return collabNFT.getCollaborator(c.address);
                }));
            })
        });
    });

    it('Withdraw balance', function() {
        return collabNFT.release(collaborators[0].address)
        .then(res => {
            return web3.eth.getBalance(collaborators[0].address)
        }).then(balance => {
            balance = web3.utils.fromWei(balance, 'ether');

            expect(balance).to.equal('100.5');
        });
    });
});
