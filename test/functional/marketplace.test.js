const { expect } = require('chai');
const hh = require('hardhat');
const ethers = require('ethers');
const { BigNumber } = require('ethers');
const waffles = require('ethereum-waffle');
const { constants } = require('@openzeppelin/test-helpers');

const { faker } = require('@faker-js/faker');


describe('Marketplace tests', function() {
    const zeroAddr = constants.ZERO_ADDRESS, addr0 = constants.ZERO_ADDRESS,
        zeroAuction = [[zeroAddr, BigNumber.from(0)], zeroAddr];

    let marketplace, nft, accounts;

    beforeEach(async () => {
        accounts = await hh.ethers.getSigners();

        const Marketplace = await hh.ethers.getContractFactory('Marketplace')
        marketplace = await Marketplace.deploy(accounts[13].address);
        await marketplace.deployed();

        const WellNFT = await hh.ethers.getContractFactory('TheWellNFT')
        nft = await WellNFT.deploy('TheWellNFT', 'WellNFT',
            faker.internet.url(), faker.finance.ethereumAddress(), 1);

        await nft.deployed();

        await nft.addApprovedMarketplace(marketplace.address);

        await Promise.all(Array(10).fill(0).map(tokenID => {
        // await Promise.all([1,2,3,4,5, 6].map(tokenID => {
            return nft.mint(100, [], [], faker.git.commitSha(), faker.random.alphaNumeric());
        }));

        // Approve all odd tokens
        await Promise.all([1,3,5,7,8,9].map(tokenID => {
            return nft.approve(marketplace.address, tokenID);
        }));

    });

    it('CreateAuction() and end auction', async function() {
        const auctionCreator = accounts[0],
            bidder = accounts[7];
        const tokenID = 1;

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID)
            .then(res => nft.ownerOf(tokenID))
            .then(res => {
                expect(res).to.equal(marketplace.address)
                return marketplace.activeAuctions(nft.address, tokenID)
            })
            .then(res => expect(res).to.have.deep.members([[nft.address, BigNumber.from(tokenID)], auctionCreator.address]))
            .then(() => {
                return marketplace.connect(bidder).bid(nft.address, tokenID);
            })
            .then(() => marketplace.activeAuctions(nft.address, tokenID))
            .then(() => marketplace.connect(auctionCreator).endAuction(nft.address, tokenID))

    });

    it('CreateReserveAuction should add auction to auction, and to activeAuctions', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;

        const auction = [auctionCreator.address, [nft.address, BigNumber.from(tokenID)]];

        return marketplace.connect(auctionCreator).createReserveAuction(nft.address, tokenID)
            .then(res => marketplace.auctions(nft.address, tokenID))
            .then(res => expect(res).to.have.deep.members(auction))
            .then(res => marketplace.activeAuctions(nft.address, tokenID))
            .then(res => expect(res).to.have.deep.members(auction))
    });

    it('View NFT history: sales and auctions');

    it("List NFT for sale");

    it('AcceptBid()');

    it("Buy NFT");

    it("Bid at reserve price");

    it('NFT is returned if reserve price is not met at the end of auction');

    it("NFT (Reserve Auction) is sold to highest bidder if reserve price is met at the ndof auction");
});
