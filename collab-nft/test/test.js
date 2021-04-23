// const { assert } = require("console");
const chai = require('chai');
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const ShopFrontContract = artifacts.require('NFTShopFront');

contract.only('ShopFront Contract', function (accounts) {
    let name = 'TEST ART';
    let symbol = 'TART';
    let collabNFTAddress;
    let artist = accounts[0],
        artistCut = 100;
    let priceInEth = web3.utils.toWei('0.04', "ether");
    let artName1 = "The Well's Monalisa";
    let tokenID = 1, tokenPriceInWEI = web3.utils.toWei('0.3', 'ether');
    let NewArtPrice;

    before(() => {
        return ShopFrontContract.new(artist, artistCut, [], [], 'https://boom.com/${id}')
        .then(res => {
            collabNFT = res;
            contractAddress = collabNFT.address;
        });
    });

    describe('Token Price - Setting, viewing and editing token price', function() {
        it('Set token price', function() {
            return collabNFT.setPrice(tokenID, tokenPriceInWEI)
            .then(res => {
                expect(res.receipt.logs[0]).to.have.property('event', 'TokenPrice');
                let event = res.receipt.logs[0].args;

                expect(event).to.include.keys('ID', 'price');
                expect(event.ID.toString()).to.equal(tokenID.toString());
                expect(event.price.toString()).to.equal(tokenPriceInWEI.toString());
            });
        });
    });

    describe.skip('Receiving ETH, Minting nft, Sending minted NFT to eth sender ', async () => {
        it('should send nft token of specified art to the eth sender upon receipt of eth', async () => {
            const tokenURI = 'localhost: http://127.0.0.1:5500/'
            //call the ReceiveEthAndMint function in the smart contract
            await collabNFT.ReceiveEthAndMint(ArtID, tokenURI, { from: accounts[6], value: NewArtPrice });

            // check nft token balance of eth sender 
            const tokenbalOfEthSender = await collabNFT.balanceOf(accounts[6])
            const nftartowner = await collabNFT.ownerOf(ArtID);

            expect(nftartowner, ' address function calling is not the owner of token').to.equal(accounts[6]);
            expect(tokenbalOfEthSender.toNumber(), 'token bal of eth sender is not 1').to.equal(1);

            const artistETHBAL = web3.eth.getBalance( artist, function (err, result) {
                if (err) {
                    console.error('Error:', err)
                } else {
                    console.log(web3.utils.fromWei(result, "ether") + " ETH")
                }
            })

            const collaboratorEthBal = web3.eth.getBalance( accounts[6], function(err, result) {
                if (err) {
                  console.error('Error:', err)
                } else {
                  console.log(web3.utils.fromWei(result, "ether") + " ETH")
                }
            })
        })
    })
})
