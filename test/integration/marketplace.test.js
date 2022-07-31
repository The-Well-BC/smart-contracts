const { expect } = require('chai');
const hh = require('hardhat');
const { ethers } = hh;
const { BigNumber } = require('ethers');
const waffles = require('ethereum-waffle');
const { constants } = require('@openzeppelin/test-helpers');

const { faker } = require('@faker-js/faker');


describe('Marketplace Integration Tests', function() {
    const zeroAddr = constants.ZERO_ADDRESS, addr0 = constants.ZERO_ADDRESS,
        zeroAuction = [[zeroAddr, BigNumber.from(0)], zeroAddr];

    let marketplace, nft, erc20, accounts;

    beforeEach(async () => {
        accounts = await hh.ethers.getSigners();

        const ERC20 = await hh.ethers.getContractFactory('MockERC20');
        erc20 = await ERC20.deploy();
        await erc20.deployed();

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

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID)
            .then(res => nft.ownerOf(tokenID))
            .then(res => {
                expect(res).to.equal(marketplace.address)
                return marketplace.activeAuctions(nft.address, tokenID)
            })
            .then(res => expect(res).to.have.deep.members([[nft.address, BigNumber.from(tokenID)], auctionCreator.address]))
            .then(() => marketplace.activeAuctions(nft.address, tokenID))
            .then(() => marketplace.connect(auctionCreator).endAuction(nft.address, tokenID))
    });

    it('CreateAuction() should transfer NFT to marketplace contract', async function() {
        const tokenID = 1;

        return marketplace.createAuction(nft.address, tokenID)
            .then(res => nft.ownerOf(tokenID))
            .then(res => expect(res).to.equal(marketplace.address))
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

    it('CreateReserveAuction() should transfer NFT to marketplace contract', function() {
        const tokenID = 3;

        return marketplace.createReserveAuction(nft.address, tokenID)
            .then(res => nft.ownerOf(tokenID))
            .then(res => expect(res).to.equal(marketplace.address))
    });

    it('Bid: bid in ether', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;
        const bidder = accounts[5];
        const bidAmount = ethers.utils.parseEther('0.05');
        const erc20Addr = zeroAddr;

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID)
            .then(() => marketplace.connect(bidder)['bid(address,uint256)'](nft.address, tokenID, {value: bidAmount}))
            .then(() => marketplace.activeBids(nft.address, tokenID))
            .then(res => {
                expect(res).to.have.deep.members([
                    BigNumber.from(bidAmount),
                    [ true, erc20Addr ],
                    [ [nft.address, BigNumber.from(tokenID)], auctionCreator.address ],
                    bidder.address
                ]);
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

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID)
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
        const tokenID = 5;
        const bidder = accounts[5];
        const bidAmount = ethers.utils.parseEther('0.05');
        const erc20Addr = erc20.address;

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID)
            .then(() => erc20.mint(bidder.address, bidAmount))
            .then(() => marketplace.connect(bidder)['bid(address,uint256,address,uint256)'](nft.address, tokenID, erc20Addr, bidAmount))
            .then(() => marketplace.activeBids(nft.address, tokenID))
            .then(res => {
                expect(res).to.have.deep.members([
                    BigNumber.from(bidAmount),
                    [ false, erc20Addr ],
                    [ [nft.address, BigNumber.from(tokenID)], auctionCreator.address ],
                    bidder.address
                ]);
            });
    });

    it('Bid in ERC20 should transfer erc20 to contract', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;
        const bidder = accounts[5];
        const bidAmount = ethers.utils.parseEther('0.05');
        const erc20Addr = erc20.address;
        let bidderBalance = ethers.utils.parseEther('0.2');

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID)
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
        const tokenID = 5;

        const previousBidder = accounts[4];
        const previousBidderBalance = ethers.utils.parseEther('0.1');
        const previousBid = {address:erc20.address, amount:ethers.utils.parseEther('0.02')};

        const currentBidder = accounts[5]
        const currentBidderBalance = BigNumber.from(ethers.utils.parseEther('0.1'));
        const currentBid = {address:erc20.address, amount:ethers.utils.parseEther('0.05')};

        let bidderBalance = ethers.utils.parseEther('0.2');

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID)
            .then(() => erc20.mint(previousBidder.address, previousBidderBalance))
            .then(() => erc20.mint(currentBidder.address, currentBidderBalance))
            .then(() => marketplace.connect(previousBidder)['bid(address,uint256,address,uint256)'](nft.address, tokenID, previousBid.address, previousBid.amount))
            .then(() => marketplace.connect(currentBidder)['bid(address,uint256,address,uint256)'](nft.address, tokenID, currentBid.address, currentBid.amount))
            .then(() => Promise.all([erc20.balanceOf(previousBidder.address), erc20.balanceOf(currentBidder.address), erc20.balanceOf(marketplace.address)]))
            .then(res => {
                expect(res[0], 'Prevous bidder balance').to.equal(previousBidderBalance); // previous bidder balance
                expect(res[1], 'Current bidder balance').to.equal(currentBidderBalance.sub(currentBid.amount)); // current bidder balance
                expect(res[2], 'Marketplace balance').to.equal(currentBid.amount); // marketplace balance
            });
    });

    it('Bid in ERC20: disallow zero address erc20', function() {
        const auctionCreator = accounts[0];
        const tokenID = 5;
        const bidder = accounts[5];
        const bidAmount = ethers.utils.parseEther('0.05');

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID)
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

        return marketplace.connect(auctionCreator).createAuction(nft.address, tokenID)
            .then(() => {
                return expect(marketplace.connect(bidder)['bid(address,uint256,address,uint256)'](nft.address, tokenID, erc20Addr,  bidAmount))
                    .to.be.reverted;
            })
    });

    it('View NFT history: sales and auctions');

    it("List NFT for sale");

    it('AcceptBid()');

    it("Buy NFT");

    it("Bid at reserve price");

    it('NFT is returned if reserve price is not met at the end of auction');

    it("NFT (Reserve Auction) is sold to highest bidder if reserve price is met at the ndof auction");
});
