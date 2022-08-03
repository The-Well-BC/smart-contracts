const { expect } = require('chai');
const hh = require('hardhat');
const { ethers } = hh;
const { BigNumber } = require('ethers');
const waffles = require('ethereum-waffle');
const { constants } = require('@openzeppelin/test-helpers');

const { faker } = require('@faker-js/faker');

const { createBidStructFromObject, createBidStruct, createAuctionStruct } = require ('../helpers/structs.js');

describe.only('Marketplace Integration Tests', function() {
    const zeroAddr = constants.ZERO_ADDRESS, addr0 = constants.ZERO_ADDRESS,
        zeroAuction = [[zeroAddr, BigNumber.from(0)], zeroAddr];

    let mockMarketplace, marketplace, nft, erc20, accounts;

    beforeEach(async () => {
        accounts = await hh.ethers.getSigners();

        const ERC20 = await hh.ethers.getContractFactory('MockERC20');
        erc20 = await ERC20.deploy();
        await erc20.deployed();

        const MockMarketplace = await hh.ethers.getContractFactory('MockMarketplace')
        mockMarketplace = await MockMarketplace.deploy();
        await mockMarketplace.deployed();

        const Marketplace = await hh.ethers.getContractFactory('Marketplace')
        marketplace = await Marketplace.deploy(accounts[13].address);
        await marketplace.deployed();

        const WellNFT = await hh.ethers.getContractFactory('TheWellNFT')
        nft = await WellNFT.deploy('TheWellNFT', 'WellNFT',
            faker.internet.url(), faker.finance.ethereumAddress(), 1);

        await nft.deployed();

        await nft.addApprovedMarketplace(marketplace.address);

        await Promise.all(Array(10).fill(0).map(tokenID => {
            return nft.mint(100, [], [], faker.git.commitSha(), faker.random.alphaNumeric());
        }));

        // Approve all odd tokens
        await Promise.all([1,3,5,7,8,9].map(tokenID => {
            return nft.approve(marketplace.address, tokenID);
        }));

    });

    it('CreateAuction() should set activeAuction and add auction to auctions[]', async function() {
        const auctionCreator = accounts[0];
        const tokenID = 1;

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID, addr0)
            .then(() => nft.ownerOf(tokenID))
            .then(res => {
                expect(res).to.equal(marketplace.address)
                return marketplace.activeAuction(nft.address, tokenID)
            })
            .then(res => {
                expect(res.creator).to.equal(auctionCreator.address);
                expect(res.nft).to.have.property('tokenContract', nft.address);
                expect(res.nft).to.have.deep.property('tokenID', BigNumber.from(tokenID));
            })
            .then(() => marketplace.activeAuction(nft.address, tokenID))
            // .then(() => marketplace.connect(auctionCreator).endAuction(nft.address, tokenID))
    });

    it('CreateAuction() should transfer NFT to marketplace contract', async function() {
        const tokenID = 1;

        return marketplace.createAuction(nft.address, tokenID, addr0)
            .then(() => nft.ownerOf(tokenID))
            .then(res => expect(res).to.equal(marketplace.address))
    });

    it('CreateReserveAuction should add auction to auctions[], and set activeAuction=auction', function() {
        const auctionCreator = accounts[0];

        // const auction = [auctionCreator.address, [nft.address, BigNumber.from(tokenID)]];
        const auction = {creator:auctionCreator.address, nft:nft.address, tokenID:BigNumber.from(5)};

        return marketplace.connect(auctionCreator).createReserveAuction(nft.address, auction.tokenID, addr0, 71, 86400)
            .then(() => marketplace.activeAuction(auction.nft, auction.tokenID))
            .then(res => {
                expect(res).to.have.property('nft');
                expect(res.nft).to.have.property('tokenContract', auction.nft);
                expect(res.nft).to.have.deep.property('tokenID', auction.tokenID);
            });
    });

    it('CreateReserveAuction() should transfer NFT to marketplace contract', function() {
        const tokenID = 3;

        return marketplace.createReserveAuction(nft.address, tokenID, addr0, 71, 86400)
            .then(() => nft.ownerOf(tokenID))
            .then(res => expect(res).to.equal(marketplace.address))
    });

    it('Bid: bid in ether', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;
        const bidder = accounts[5];
        const bidAmount = ethers.utils.parseEther('0.05');
        const erc20Addr = zeroAddr;

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID, addr0)
            .then(() => marketplace.connect(bidder)['bid(address,uint256)'](nft.address, tokenID, {value: bidAmount}))
            .then(() => marketplace.activeBids(nft.address, tokenID))
            .then(res => {
                expect(res).to.have.deep.property('amount', BigNumber.from(bidAmount))
                expect(res).to.have.property('bidder', bidder.address);
                expect(res).to.have.property('currency');
                expect(res.currency).to.have.property('isEther', true);
                expect(res.currency).to.have.property('_address', addr0);
            });
    });

    it('Bid in ether: Return previous bidder their bid', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;

        const previousBidder = accounts[4];
        let previousBidderBalance, txFee
        const previousBid = ethers.utils.parseEther('0.02');

        const currentBidder = accounts[5]
        const currentBid = ethers.utils.parseEther('0.05');

        let bidderBalance = ethers.utils.parseEther('0.2');

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID, addr0)
            .then(() => ethers.provider.getBalance(previousBidder.address))
            .then(res => previousBidderBalance = res)
            .then(() => marketplace.connect(previousBidder)['bid(address,uint256)'](nft.address, tokenID, {value:previousBid}))
            .then(tx => {
                return tx.wait()
                .then(res => {
                    txFee = res.effectiveGasPrice.mul(res.gasUsed);
                    console.log(txFee.toString(), 'tx fee:');
                });
            })
            .then(() => marketplace.connect(currentBidder)['bid(address,uint256)'](nft.address, tokenID, {value:currentBid}))
            .then(() => ethers.provider.getBalance(previousBidder.address))
            .then(res => {
                expect(res, 'Prevous bidder balance').to.equal(previousBidderBalance.sub(txFee)); // previous bidder balance
            });
    });

    it('Bid in ERC20 should create active bid', function() {
        const auctionCreator = accounts[0];
        const erc20Addr = erc20.address;
        const bid = {amount: ethers.utils.parseEther('0.05'),
            bidder:accounts[5], tokenID: 5, erc20:erc20.address}

        console.log('marketplace address:', marketplace.address, '\nbidder address:', bid.bidder.address);
        return marketplace.connect(auctionCreator).createAuction(nft.address, bid.tokenID, bid.erc20)
            .then(() => erc20.mint(bid.bidder.address, bid.amount))
            .then(() => erc20.balanceOf(bid.bidder.address))
            .then(res => console.log('ers:', res, bid.amount))
            .then(() => marketplace.connect(bid.bidder)['bid(address,uint256,address,uint256)'](nft.address, bid.tokenID, bid.erc20, bid.amount))
            .then(() => marketplace.activeBids(nft.address, bid.tokenID))
            .then(res => {
                expect(res).to.have.deep.property('amount', BigNumber.from(bid.amount));
                expect(res).to.have.property('bidder', bid.bidder.address);
                expect(res).to.have.property('currency');
                expect(res.currency).to.have.property('isEther', false);
                expect(res.currency).to.have.property('_address', bid.erc20);
            });
    });

    it('Bid in ERC20 should transfer erc20 to contract', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;
        const bidder = accounts[5];
        const bidAmount = ethers.utils.parseEther('0.05');
        const erc20Addr = erc20.address;
        let bidderBalance = ethers.utils.parseEther('0.2');

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID, erc20Addr)
            .then(() => erc20.mint(bidder.address, bidderBalance))
            .then(() => marketplace.connect(bidder)['bid(address,uint256,address,uint256)'](nft.address, tokenID, erc20Addr, bidAmount))
            .then(() => Promise.all([erc20.balanceOf(bidder.address), erc20.balanceOf(marketplace.address)]))
            .then(res => {
                expect(res[0]).to.equal(bidderBalance.sub(bidAmount));
                expect(res[1]).to.equal(BigNumber.from(bidAmount));
            });
    });

    it('Bid in ERC20: Return previous bidder their bid', function() {
        const auctionCreator = accounts[0];
        const auction = {
            nftAddress: nft.address, tokenID: 5,
            erc20: erc20.address,
        }

        const previousBidder = accounts[4];
        const previousBidderBalance = ethers.utils.parseEther('0.1');
        const previousBid = {address:auction.erc20, amount:ethers.utils.parseEther('0.08')};

        const currentBidder = accounts[5]
        const currentBidderBalance = BigNumber.from(ethers.utils.parseEther('0.1'));
        const currentBid = {address:auction.erc20, amount:ethers.utils.parseEther('0.09')};

        let bidderBalance = ethers.utils.parseEther('0.2');

        return marketplace.connect(auctionCreator).createAuction(auction.nftAddress, auction.tokenID, auction.erc20)
            .then(() => erc20.mint(previousBidder.address, previousBidderBalance))
            .then(() => erc20.mint(currentBidder.address, currentBidderBalance))
            .then(() => marketplace.connect(previousBidder)['bid(address,uint256,address,uint256)'](nft.address, auction.tokenID, previousBid.address, previousBid.amount))
            .then(() => marketplace.connect(currentBidder)['bid(address,uint256,address,uint256)'](nft.address, auction.tokenID, currentBid.address, currentBid.amount))
            .then(() => Promise.all([erc20.balanceOf(previousBidder.address), erc20.balanceOf(marketplace.address)]))
            .then(res => {
                expect(res[0], 'Prevous bidder balance').to.equal(previousBidderBalance); // previous bidder balance
            });
    });

    it('Bid in ERC20: disallow zero address erc20', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;
        const bidder = accounts[5];
        const bidAmount = ethers.utils.parseEther('0.05');

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID, addr0)
            .then(() => {
                return expect(marketplace.connect(bidder)['bid(address,uint256,address,uint256)'](nft.address, tokenID, zeroAddr,  bidAmount))
                    .to.be.reverted;
            })
    });

    it('Bid in ERC20: disallow zero for bid amount', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;
        const bidder = accounts[5];
        const erc20Addr = erc20.address;
        const bidAmount = ethers.utils.parseEther('0');

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID, addr0)
            .then(() => {
                return expect(marketplace.connect(bidder)['bid(address,uint256,address,uint256)'](nft.address, tokenID, erc20Addr,  bidAmount))
                    .to.be.reverted;
            })
    });

    describe('Bid on reserve auction', function() {
        it('Bids under reserve price should not extend auction', function() {
            const now = new Date();
            let threeDays = new Date().setDate(now.getDate() + 3);

            const bidder = accounts[7];
            const auctionCreator = accounts[0], notAuctionCreator = accounts[3];
            const auction = {nft:nft.address, tokenID:6,
                creator:auctionCreator.address, currency:addr0,
                endDate: BigNumber.from(parseInt(threeDays/1000)),
                reservePrice:BigNumber.from(ethers.utils.parseEther('0.5')),
                reserveDuration:86400 * 12};

            return mockMarketplace._setActiveAuction( createAuctionStruct(auction) )
                .then(() => mockMarketplace.connect(bidder)['bid(address,uint256)'](auction.nft, auction.tokenID, {value:auction.reservePrice.sub(122)}))
                .then(() => mockMarketplace.activeAuction(auction.nft, auction.tokenID))
                .then(res => {
                    expect(res.endDate).to.equal(auction.endDate);
                });
        });

        it('Bid at reserve price should extend auction by reserve duration', function() {
            const now = new Date();
            let threeDays = new Date().setDate(now.getDate() + 3);
            let newEndDate = BigNumber.from(parseInt(new Date().setDate(now.getDate() + 12) / 1000));

            const bidder = accounts[7];
            const auctionCreator = accounts[0], notAuctionCreator = accounts[3];
            const auction = {nft:nft.address, tokenID:6,
                creator:auctionCreator.address, currency:addr0,
                endDate: BigNumber.from(parseInt(threeDays/1000)),
                reservePrice:ethers.utils.parseEther('0.5'),
                reserveDuration: 86400 * 12};

            return mockMarketplace._setActiveAuction( createAuctionStruct(auction) )
                .then(() => mockMarketplace.connect(bidder)['bid(address,uint256)'](auction.nft, auction.tokenID, {value:auction.reservePrice}))
            // .then(() => time.increaseTo(fourDays))
                .then(() => mockMarketplace.activeAuction(auction.nft, auction.tokenID))
                .then(res => {
                    expect(res.endDate).to.be.closeTo(newEndDate, 600);
                });
        });

        it('Bid above reserve price should extend auction by reserve duration', function() {
            const now = new Date();
            let threeDays = new Date().setDate(now.getDate() + 3);
            let newEndDate = BigNumber.from(parseInt(new Date().setDate(now.getDate() + 12) / 1000));

            // newEndDate = BigNumber.from(newEndDate/1000);

            const bidder = accounts[7];
            const auctionCreator = accounts[0], notAuctionCreator = accounts[3];
            const auction = {nft:nft.address, tokenID:6,
                creator:auctionCreator.address, currency:addr0,
                endDate: BigNumber.from(parseInt(threeDays/1000)),
                reservePrice:BigNumber.from(ethers.utils.parseEther('0.5')),
                reserveDuration:86400 * 12};

            return mockMarketplace._setActiveAuction( createAuctionStruct(auction) )
                .then(() => mockMarketplace.connect(bidder)['bid(address,uint256)'](auction.nft, auction.tokenID, {value:auction.reservePrice.add(230000)}))
                .then(() => mockMarketplace.activeAuction(auction.nft, auction.tokenID))
                .then(res => {
                    expect(res.endDate).to.be.closeTo(newEndDate, 600);
                });
        });

        it('Subsequent bids above reserve price should not extend auction', function() {
            const now = new Date();
            let threeDays = new Date().setDate(now.getDate() + 3);

            const bidder = accounts[7];
            const auctionCreator = accounts[0], notAuctionCreator = accounts[3];
            const auction = {nft:nft.address, tokenID:6,
                creator:auctionCreator.address, currency:addr0,
                endDate: BigNumber.from(parseInt(threeDays/1000)),
                reservePrice:ethers.utils.parseEther('0.5'),
                reserveDuration:86400 * 12};

            const activeBid = {amount: BigNumber.from(auction.reservePrice).add(5), auction};

            return mockMarketplace._setActiveAuction( createAuctionStruct(auction) )
                .then(() => mockMarketplace._setActiveBid( createBidStruct(activeBid) ))
                .then(() => mockMarketplace.connect(bidder)['bid(address,uint256)'](auction.nft, auction.tokenID, {value:activeBid.amount.add(122)}))
            // .then(() => time.increaseTo(fourDays))
                .then(() => mockMarketplace.activeAuction(auction.nft, auction.tokenID))
                .then(res => {
                    expect(res.endDate).to.equal(auction.endDate);
                });
        });
    });

    it('View NFT history: sales and auctions');

    it("List NFT for sale");

    it('AcceptBid()');

    it("Buy NFT");

    it("Bid at reserve price");

    it('NFT is returned if reserve price is not met at the end of auction');

    it("NFT (Reserve Auction) is sold to highest bidder if reserve price is met at the ndof auction");
});
