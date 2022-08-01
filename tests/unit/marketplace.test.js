const { expect } = require('chai');
const hh = require('hardhat');
const ethers = require('ethers');
const { BigNumber } = require('ethers');
const waffles = require('ethereum-waffle');
const { constants } = require('@openzeppelin/test-helpers');

const { faker } = require('@faker-js/faker');

const zeroAddr = constants.ZERO_ADDRESS, addr0 = constants.ZERO_ADDRESS;

function createAuction(nftAddr=zeroAddr, tokenID=0, creator=addr0, currency, endDate=0) {
    if(!Array.isArray(currency)) {
        if(currency == addr0)
            currency = [true, addr0];
        else if(!currency)
            currency = [false,addr0];
        else currency = [false, currency];
    }

    if(endDate == undefined)
        endDate = new Date();

    if(endDate instanceof Date)
        endDate = parseInt(endDate.getTime()/1000);

    if(!isNaN(endDate) && !(endDate instanceof BigNumber))
        endDate = BigNumber.from(endDate);

    const auction_ = [[nftAddr, BigNumber.from(tokenID)], creator, currency, endDate];

    return auction_;
}

// function createAuctionStruct(auction={}) {
function createAuctionStruct(auction={}) {
    if(auction == null || typeof auction != 'object')
        auction = {};

    const {nft=addr0, tokenID=0, creator=addr0, currency=[false,addr0], endDate=0} = auction;
    return createAuction(nft,
        tokenID,
        creator, currency, endDate);
}

function createBid(auction=createAuction(), amount=0, currency=addr0, bidder=addr0) {
    if(currency == addr0)
        currency = [true, addr0];
    else currency = [false, currency];

    if(auction.nft)
        auction = createAuctionStruct(auction);

    const bid_ = [amount, currency, auction, bidder];

    return bid_;
}

function createBidFromObject(bid) {
    return createBid(bid.auction, bid.amount, bid.currency || bid.currencyAddress, bid.bidder);
}

describe.only('Marketplace unit tests', function() {
    let marketplace, mockNFT, mock, accounts;

    beforeEach(async () => {
        accounts = await hh.ethers.getSigners();

        const Marketplace = await hh.ethers.getContractFactory('MockMarketplace')
        marketplace = await Marketplace.deploy();
        await marketplace.deployed();

        const MockContract = await hh.ethers.getContractFactory('MockContract')
        mock = await MockContract.deploy();
        await mock.deployed();

        mockNFT = await hh.ethers.getContractAt('IERC721', mock.address)
    });

    it('Admin functions should fail if they are called by non-admin'); 

    it('CreateAuction() should call NFT.transferFrom', async function() {
        const tokenID = 1, caller = accounts[5];
        let callData = mockNFT.interface.encodeFunctionData('transferFrom', [caller.address, marketplace.address, tokenID]);
        const currency = addr0;

        return marketplace.connect(caller).createAuction(mockNFT.address, tokenID, currency)
            .then(() => mock.invocationCountForCalldata(callData))
            .then(res => expect(res).to.equal(1))
    });

    it('CreateReserveAuction() should call NFT.transferFrom', async function() {
        const tokenID = 1, caller = accounts[5];
        let callData = mockNFT.interface.encodeFunctionData('transferFrom', [caller.address, marketplace.address, tokenID]);
        const currency = addr0;

        return marketplace.connect(caller).createReserveAuction(mockNFT.address, tokenID, currency)
            .then(() => mock.invocationCountForCalldata(callData))
            .then(res => expect(res).to.equal(1))
    });

    it('CreateAuction should add auction to auction, and to activeAuctions', function() {
        const auctionCreator = accounts[0];
        const auction = {nft: mockNFT.address, tokenID:3, creator: auctionCreator.address};
        const currency = addr0;

        return marketplace.connect(auctionCreator).createAuction(mockNFT.address, auction.tokenID, currency)
            .then(res => Promise.all([
                marketplace.getAuctions(mockNFT.address, auction.tokenID),
                marketplace.activeAuction(mockNFT.address, auction.tokenID)
            ]))
            .then(resArray => {
                resArray = [resArray[0], [resArray[1]]];

                resArray.forEach(res => {
                    expect(res).to.be.an('array').that.has.lengthOf(1);
                    const a = res[0];
                    expect(a[0]).to.include.deep.members([ auction.nft, BigNumber.from(auction.tokenID) ])
                    expect(a[1]).to.equal(auction.creator)
                    expect(a[2]).to.have.members([true, addr0])
                    expect(a[3]).to.be.an.instanceof(BigNumber);
                })
            })
    });

    it('CreateReserveAuction should add auction to auction, and to activeAuctions', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;

        const auction = {nft: mockNFT.address, tokenID, creator: auctionCreator.address};

        return marketplace.connect(auctionCreator).createReserveAuction(mockNFT.address, tokenID, addr0)
            .then(res => Promise.all([
                marketplace.getAuctions(mockNFT.address, tokenID),
                marketplace.activeAuction(mockNFT.address, tokenID)
            ]))
            .then(resArray => {
                resArray = [resArray[0], [resArray[1]]];

                resArray.forEach(res => {
                    expect(res).to.be.an('array').that.has.lengthOf(1);
                    const a = res[0];
                    expect(a[0]).to.include.deep.members([ auction.nft, BigNumber.from(auction.tokenID) ])
                    expect(a[1]).to.equal(auction.creator)
                    expect(a[2]).to.have.members([true, addr0])
                    expect(a[3]).to.be.an.instanceof(BigNumber);
                })
            })
    });

    it('Create[Reserve]Auction fail if trying to called on NFT already in an auction', function() {
        const auctionCreator = accounts[0], notAuctionCreator = accounts[3];
        const auction = {nft:mockNFT.address, tokenID:6, creator:auctionCreator.address, currency:addr0};

        return marketplace._setActiveAuction( createAuctionStruct(auction) )
            .then(() => expect(marketplace.createAuction(auction.nft, auction.tokenID, auction.currency))
                .to.be.revertedWith('WellMarket: NFT is already in an auction'))
            .then(() => expect(marketplace.createReserveAuction(auction.nft, auction.tokenID))
                .to.be.reverted)
    });

    describe('EndAuction', function() {
        it('EndAuction should fail when called on NFT not in an auction', function() {
            const tokenID = 5;

            return expect(marketplace.endAuction(mockNFT.address, tokenID))
                .to.be.revertedWith('WellMarket: Auction not found');
        });

        it('EndAuction should fail when called on NFT that was previously in an auction but not longer is', function() {
            const tokenID = 9;

            return expect(marketplace.endAuction(mockNFT.address, tokenID))
                .to.be.revertedWith('WellMarket: Auction not found');
        });

        it('EndAuction should fail if called before auction time is up', function() {
            let endDate = new Date();
            endDate = parseInt(endDate.setDate(new Date().getDate() + 7) / 1000);

            const nftAddr = mockNFT.address;
            const auctionCreator = accounts[5];
            const auction = {nft: faker.finance.ethereumAddress(), tokenID:8, creator: accounts[5].address, currency:addr0, endDate};
            console.log('auction:', auction);

            // const bid = createBid(auction1, initBid, currency, bidder.address);

            return marketplace._setActiveAuction( createAuctionStruct(auction) )
            .then(() => expect(marketplace.endAuction( auction.nft, auction.tokenID)).to.be.revertedWith(`AuctionNotExpired(${ endDate })`))
        });

        it('EndAuction should remove auction from activeAuctions mapping', function() {
            const nftAddress = mockNFT.address, tokenID = 6;
            const auctionCreator = accounts[0];
            const zeroAuction = createAuctionStruct();
            const auction = {nft:mockNFT.address, tokenID:6, creator:auctionCreator.address, currency:[true, addr0]};

            return marketplace._setActiveAuction( createAuctionStruct(auction) )
                .then(() => marketplace.endAuction(nftAddress, tokenID))
                .then(() => marketplace.activeAuction(nftAddress, tokenID))
                .then(res => {
                    expect(res, 'Auction details should be zero').to.have.deep.ordered.members(createAuctionStruct())
                });
        });


        it('EndAuction will not remove auction from auctions mapping', function() {
            const nftAddress = mockNFT.address, tokenID = 8;

            const auctionCreator = accounts[0];
            const auction = createAuction(nftAddress, tokenID, auctionCreator.address);

            return marketplace._setActiveAuction(auction)
                .then(() => marketplace.endAuction(mockNFT.address, tokenID))
                .then(() => marketplace.getAuctions(mockNFT.address, tokenID))
                .then(res => expect(res).to.include.deep.members([auction]));
        });
    });

    it('Bid: Fail if bidding on inactive auction', function() {
        const tokenID = 4;

        return expect(marketplace['bid(address,uint256)'](mockNFT.address, tokenID)).to.be.revertedWith('WellMarket: NFT not in active auction');
    });

    it('Bid: Fail if bidding on inactive auction and NFT was in a previous auction', function() {
        const tokenID = 9;

        return expect(marketplace['bid(address,uint256)'](mockNFT.address, tokenID)).to.be.revertedWith('WellMarket: NFT not in active auction')
            .then(() => expect(marketplace['bid(address,uint256,address,uint256)'](mockNFT.address, tokenID, faker.finance.ethereumAddress(), 5)).to.be.revertedWith('WellMarket: NFT not in active auction'));
    });

    it('Reject bid if currency is not equal to auction currency', function() {
        const nftAddr = mockNFT.address;
        const auctionCreator = accounts[5], tokenID= 8;
        const bidder = accounts[7];
        const auction1 = {nft: faker.finance.ethereumAddress(), tokenID:8, creator: accounts[5].address, currency:addr0};
        const auction2 = {nft: faker.finance.ethereumAddress(), tokenID:3, creator: accounts[9].address, currency:faker.finance.ethereumAddress()};

        // const bid = createBid(auction1, initBid, currency, bidder.address);

        return marketplace._setActiveAuction( createAuctionStruct(auction1) )
            .then(() => marketplace._setActiveAuction(createAuctionStruct(auction2)))

            .then(() => expect(
                marketplace.connect(bidder)['bid(address,uint256,address,uint256)'](auction1.nft, auction1.tokenID, faker.finance.ethereumAddress(), 5))
                .to.be.revertedWith('WellMarket: Bid currency must match auction currency'))

            .then(() => expect(
                marketplace.connect(bidder)['bid(address,uint256)'](auction2.nft, auction2.tokenID, {value: 5}))
                .to.be.revertedWith('WellMarket: Bid currency must match auction currency'))
    });

    describe('New bid must be higher than active bid', function() {
        it('Reject if bid is equal to active bid', function() {
            const bidAmount = 5000;
            const bidder = accounts[7];
            const auction1 = {nft: faker.finance.ethereumAddress(), tokenID:8, creator: accounts[5].address, currency:faker.finance.ethereumAddress()};
            const auction2 = {nft: faker.finance.ethereumAddress(), tokenID:3, creator: accounts[9].address, currency:addr0};

            const activeBid1 = {auction: auction1, bidder:bidder.address, creator:auction1.creator, currency:auction1.currency, amount: bidAmount};
            const activeBid2 = {auction: auction2, bidder:bidder.address, creator:auction2.creator, currency:auction2.currency, amount: bidAmount};

            // Create auctions
            return marketplace._setActiveAuction( createAuctionStruct(auction1) )
                .then(() => marketplace._setActiveAuction(createAuctionStruct(auction2)))

            // create bids
                .then(() => marketplace._setActiveBid(createBidFromObject(activeBid1)))
                .then(() => marketplace._setActiveBid(createBidFromObject(activeBid2)))

                .then(() => expect(
                    marketplace.connect(bidder)['bid(address,uint256,address,uint256)'](auction1.nft, auction1.tokenID, auction1.currency, bidAmount))
                    .to.be.revertedWith('BidTooLow(5000, 5000)'))

                .then(() => expect(
                    marketplace.connect(bidder)['bid(address,uint256)'](auction2.nft, auction2.tokenID, {value: bidAmount}))
                    .to.be.revertedWith('BidTooLow(5000, 5000)'))
        });

        it('Reject if bid is less than active bid', function() {
            const bidAmount = 5000;
            const bidder = accounts[7];
            const auction1 = {nft: faker.finance.ethereumAddress(), tokenID:8, creator: accounts[5].address, currency:faker.finance.ethereumAddress()};
            const auction2 = {nft: faker.finance.ethereumAddress(), tokenID:3, creator: accounts[9].address, currency:addr0};

            const activeBid1 = {auction: auction1, bidder:bidder.address, creator:auction1.creator, currency:auction1.currency, amount: bidAmount};
            const activeBid2 = {auction: auction2, bidder:bidder.address, creator:auction2.creator, currency:auction2.currency, amount: bidAmount};

            // Create auctions
            return marketplace._setActiveAuction( createAuctionStruct(auction1) )
                .then(() => marketplace._setActiveAuction( createAuctionStruct(auction2) ))

            // create bids
                .then(() => marketplace._setActiveBid(createBidFromObject(activeBid1)))
                .then(() => marketplace._setActiveBid(createBidFromObject(activeBid2)))

                .then(() => expect(
                    marketplace.connect(bidder)['bid(address,uint256,address,uint256)'](auction1.nft, auction1.tokenID, auction1.currency, bidAmount - 1))
                    .to.be.revertedWith('BidTooLow(5000, 4999)'))

                .then(() => expect(
                    marketplace.connect(bidder)['bid(address,uint256)'](auction2.nft, auction2.tokenID, {value: bidAmount - 1}))
                    .to.be.revertedWith('BidTooLow(5000, 4999)'))
        });
    });

    it.skip('Bid: When auction duration has expired, and endAuction is called, active bid should be automatically be accepted', function() {
        const auctionCreator = accounts[5], tokenID= 8;
        const bidder = accounts[7];
        const auction = createAuction(mockNFT.address, tokenID, auctionCreator.address);
        const initBid = 0, currency=addr0;
        const bid = createBid(auction, initBid, currency, bidder.address);

        return marketplace._setActiveAuction(auction)
            .then(() => marketplace._setActiveBid(bid))
            .then(() => marketplace.endAuction(mockNFT.address, tokenID))
    });

    it('View bids history');

    it('View NFT history: sales and auctions');

    it("List NFT for sale");

    it('AcceptBid()');

    it("Buy NFT");

    it("Bid at reserve price");

    it('NFT is returned if reserve price is not met at the end of auction');

    it("NFT (Reserve Auction) is sold to highest bidder if reserve price is met at the ndof auction");
});
