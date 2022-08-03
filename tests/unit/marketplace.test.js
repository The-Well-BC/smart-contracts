const hh = require('hardhat');
const ethers = require('ethers');
const { expect } = require('chai');
const { BigNumber } = require('ethers');
const waffles = require('ethereum-waffle');
const { constants } = require('@openzeppelin/test-helpers');
const { time } = require("@nomicfoundation/hardhat-network-helpers");

const { createBidStructFromObject, createBidStruct, createAuctionStruct } = require ('../helpers/structs.js');

const { faker } = require('@faker-js/faker');

const zeroAddr = constants.ZERO_ADDRESS, addr0 = constants.ZERO_ADDRESS;

describe('Marketplace unit tests', function() {
    let Marketplace, marketplace, spy, mockNFT, mock, accounts;

    beforeEach(async () => {
        accounts = await hh.ethers.getSigners();

        Marketplace = await hh.ethers.getContractFactory('MockMarketplace')
        marketplace = await Marketplace.deploy();
        await marketplace.deployed();

        const MockContract = await hh.ethers.getContractFactory('MockContract')
        mock = await MockContract.deploy();
        await mock.deployed();

        mockNFT = await hh.ethers.getContractAt('IERC721', mock.address)

        const Spy = await hh.ethers.getContractFactory('Spy');
        spy = await Spy.deploy(marketplace.address);
        await spy.deployed();
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

        return marketplace.connect(caller).createReserveAuction(mockNFT.address, tokenID, currency, 25, 0)
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
                    expect(a.nft).to.include.deep.members([ auction.nft, BigNumber.from(auction.tokenID) ])
                    expect(a.creator).to.equal(auction.creator)
                    expect(a.currency).to.have.members([true, addr0])
                    expect(a.endDate).to.be.an.instanceof(BigNumber);
                })
            })
    });

    it('CreateReserveAuction should create new auction with reserve price', function() {
        const auctionCreator = accounts[0];
        const auction = {nft: mockNFT.address, tokenID:3, currency:addr0, creator:auctionCreator.address, reservePrice:30000};

        return marketplace.connect(auctionCreator).createReserveAuction(auction.nft, auction.tokenID, auction.currency, auction.reservePrice, 0)
            .then(res => Promise.all([
                marketplace.getAuctions(mockNFT.address, auction.tokenID),
                marketplace.activeAuction(mockNFT.address, auction.tokenID)
            ]))
            .then(resArray => {
                resArray = [resArray[0], [resArray[1]]];

                resArray.forEach(res => {
                    expect(res).to.be.an('array').that.has.lengthOf(1);
                    const a = res[0];
                    expect(a.reservePrice).to.equal(BigNumber.from(auction.reservePrice));
                })
            })
    });

    it('Create[Reserve]Auction should set auction EndDate as 7 days from now', function() {
        const now = new Date();

        let oneWeek = new Date().setDate(now.getDate() + 7);
        oneWeek = BigNumber.from(parseInt(oneWeek/1000));

        const auction1 = {nft: mockNFT.address, tokenID:3, creator: accounts[5].address, signer: accounts[5], currency:addr0};
        const auction2 = {nft: mockNFT.address, tokenID:7, creator: accounts[9].address, signer: accounts[9], currency:addr0};

        return Promise.all([
            marketplace.connect(auction1.signer).createAuction(auction1.nft, auction1.tokenID, auction1.currency),
            marketplace.connect(auction2.signer).createReserveAuction(auction2.nft, auction2.tokenID, auction2.currency, 12, 0)
        ])
            .then(res => Promise.all([

                marketplace.getAuctions(auction1.nft, auction1.tokenID),
                marketplace.activeAuction(auction1.nft, auction1.tokenID),

                marketplace.getAuctions(auction2.nft, auction2.tokenID),
                marketplace.activeAuction(auction2.nft, auction2.tokenID),
            ]))
            .then(resArray => {
                const res = [resArray[0][0], resArray[1], resArray[2][0], resArray[3]];

                res.forEach(auction_ => {
                    expect(auction_.endDate).to.be.closeTo(oneWeek, 600);
                });
            })
    });

    it('CreateReserveAuction should add auction to auction, and to activeAuctions', function() {
        const auctionCreator = accounts[0], reservePrice=12;
        const tokenID = 5;

        const auction = {nft: mockNFT.address, tokenID, creator: auctionCreator.address};

        return marketplace.connect(auctionCreator).createReserveAuction(mockNFT.address, tokenID, addr0, reservePrice, 0)
            .then(res => Promise.all([
                marketplace.getAuctions(mockNFT.address, tokenID),
                marketplace.activeAuction(mockNFT.address, tokenID)
            ]))
            .then(resArray => {
                resArray = [resArray[0], [resArray[1]]];

                resArray.forEach(res => {
                    expect(res).to.be.an('array').that.has.lengthOf(1);
                    const a = res[0];
                    expect(a.nft).to.include.deep.members([ auction.nft, BigNumber.from(auction.tokenID) ])
                    expect(a.creator).to.equal(auction.creator)
                    expect(a.currency).to.have.members([true, addr0])
                    expect(a.endDate).to.be.an.instanceof(BigNumber);
                    expect(a.reservePrice).to.equal(BigNumber.from(reservePrice));
                })
            })
    });

    it('Create[Reserve]Auction fail if trying to called on NFT already in an auction', function() {
        const auctionCreator = accounts[0], notAuctionCreator = accounts[3];
        const auction = {nft:mockNFT.address, tokenID:6, creator:auctionCreator.address, currency:addr0};

        return marketplace._setActiveAuction( createAuctionStruct(auction) )
            .then(() => expect(marketplace.createAuction(auction.nft, auction.tokenID, auction.currency))
                .to.be.revertedWith('WellMarket: NFT is already in an auction'))
            .then(() => expect(marketplace.createReserveAuction(auction.nft, auction.tokenID, auction.currency, 300, 0))
                .to.be.revertedWith('WellMarket: NFT is already in an auction'))
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
            const auction = createAuctionStruct(nftAddress, tokenID, auctionCreator.address);

            return marketplace._setActiveAuction(auction)
                .then(() => marketplace.endAuction(mockNFT.address, tokenID))
                .then(() => marketplace.getAuctions(mockNFT.address, tokenID))
                .then(res => expect(res).to.include.deep.members([auction]));
        });

        it.skip('Bid: When auction duration has expired, and endAuction is called, active bid should be automatically be accepted', function() {
            const auctionCreator = accounts[5], tokenID= 8;
            const bidder = accounts[7];
            const auction = createAuctionStruct(mockNFT.address, tokenID, auctionCreator.address);
            const initBid = 0, currency=addr0;
            const bid = createBidStruct(auction, initBid, currency, bidder.address);

            return marketplace._setActiveAuction(auction)
                .then(() => marketplace._setActiveBid(bid))
                .then(() => marketplace.endAuction(mockNFT.address, tokenID))
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
                .then(() => marketplace._setActiveBid(createBidStructFromObject(activeBid1)))
                .then(() => marketplace._setActiveBid(createBidStructFromObject(activeBid2)))

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
                .then(() => marketplace._setActiveBid(createBidStructFromObject(activeBid1)))
                .then(() => marketplace._setActiveBid(createBidStructFromObject(activeBid2)))

                .then(() => expect(
                    marketplace.connect(bidder)['bid(address,uint256,address,uint256)'](auction1.nft, auction1.tokenID, auction1.currency, bidAmount - 1))
                    .to.be.revertedWith('BidTooLow(5000, 4999)'))

                .then(() => expect(
                    marketplace.connect(bidder)['bid(address,uint256)'](auction2.nft, auction2.tokenID, {value: bidAmount - 1}))
                    .to.be.revertedWith('BidTooLow(5000, 4999)'))
        });

        it('AcceptBid()');

        it("Bid at reserve price");

        it("NFT (Reserve Auction) is sold to highest bidder if reserve price is met at the ndof auction");

        it('NFT is returned if reserve price is not met at the end of auction');

    });


    describe('Sales', function() {
        it("List NFT for sale");

        it("Buy NFT");
    });
});
