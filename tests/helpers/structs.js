const ethers = require('ethers');
const { BigNumber } = require('ethers');
const { constants } = require('@openzeppelin/test-helpers');
const zeroAddr = constants.ZERO_ADDRESS, addr0 = constants.ZERO_ADDRESS;

function _createAuctionStruct(nftAddr=zeroAddr, tokenID=0, creator=addr0, currency, endDate=0, reservePrice=0, reserveDuration=0) {
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

    if(!(reservePrice instanceof BigNumber))
        reservePrice = BigNumber.from(reservePrice);

    if(!(reserveDuration instanceof BigNumber))
        reserveDuration = BigNumber.from(reserveDuration);

    const auction_ = [[nftAddr, BigNumber.from(tokenID)], creator, currency, endDate, reservePrice, reserveDuration];

    return auction_;
}

// function createAuctionStruct(auction={}) {
function createAuctionStruct(auction={}) {
    if(typeof auction != 'object') {
        if(auction == null)
            auction = {};
        else
            return _createAuctionStruct(...arguments);
    }

    const {nft=addr0, tokenID=0, creator=addr0, currency=[false,addr0], endDate=0, reservePrice=0, reserveDuration=0} = auction;
    return _createAuctionStruct(nft,
        tokenID,
        creator, currency, endDate, reservePrice, reserveDuration);
}

function _createBidStruct(auction=createAuctionStruct(), amount=0, currency=addr0, bidder=addr0) {
    if(currency == addr0)
        currency = [true, addr0];
    else currency = [false, currency];

    if(auction.nft)
        auction = createAuctionStruct(auction);

    const bid_ = [amount, currency, auction, bidder];

    return bid_;
}

function createBidStruct(firstParam=createAuctionStruct(), amount=0, currency=addr0, bidder=addr0) {
    if(!Array.isArray(firstParam) && typeof firstParam == 'object') {
        if(firstParam.auction) {
            const bid = firstParam

            return _createBidStruct(bid.auction, bid.amount, bid.currency || bid.currencyAmount, bid.bidder);
        } else {
            return _createBidStruct(firstParam, amount, currency, bidder);
        }
    }
}

function createBidStructFromObject(bid) {
    return _createBidStruct(bid.auction, bid.amount, bid.currency || bid.currencyAddress, bid.bidder);
}


module.exports = {
    createBidStructFromObject,
    createBidStruct,
    createAuctionStruct,
}
