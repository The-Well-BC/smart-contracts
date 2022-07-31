// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IMarketplace} from "./IMarketplace.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import {IPayments} from "./IPayments.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

// Marketplace will facilitate sales, and auctions of NFTs
// NFTs will have three states: listed for sale, auction, and reserve auction
contract Marketplace is IMarketplace, ReentrancyGuard{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;
    address _admin;

    mapping (IERC721 => mapping(uint256 => Auction[])) public auctions;

    mapping (IERC721 => mapping(uint256 => Auction)) public activeAuction;

    mapping (IERC721 => mapping(uint256 => Bid)) public activeBids;

    error BidTooLow(uint256 activeBidAmount, uint256 newBidAmount);
    error UintDebugger(uint val);
    error AddressDebugger(address val);
    error CannotEndAuctionYet();

    constructor(address admin) {
        _admin = admin;
    }

    function getAuctions(IERC721 nftAddress, uint256 tokenID) external view returns(Auction[] memory) {
        return auctions[nftAddress][tokenID];
    }

    function createAuction(IERC721 nftAddress, uint256 tokenID, IERC20 currencyAddress) public override {
        address owner_ = msg.sender;
        IERC721 nft = IERC721(nftAddress);

        Auction storage activeAuction_ = activeAuction[nftAddress][tokenID];

        require(activeAuction_.nft.tokenContract == IERC721(address(0)),
                'WellMarket: NFT is already in an auction');

        NFT memory nftObj = NFT(nftAddress, tokenID);

        Currency memory currency;
        if(currencyAddress == IERC20(address(0)))
            currency.isEther = true;
        else {
            currency.isEther = false;
            currency._address = currencyAddress;
        }

        uint256 endDate = block.timestamp;

        Auction memory newAuction = Auction(nftObj, msg.sender, currency, endDate);

        Auction[] storage nftAuctions = auctions[nftAddress][tokenID];
        nftAuctions.push(newAuction);
        activeAuction[nftAddress][tokenID] = newAuction;

        nft.transferFrom(owner_, address(this), tokenID); 
    }

    function createReserveAuction(IERC721 nftAddress, uint256 tokenID, IERC20 currencyAddress) external override {
        createAuction(nftAddress, tokenID, currencyAddress);
    }

    function endAuction(IERC721 nftAddress, uint256 tokenID) external override {
        Auction memory auction = activeAuction[nftAddress][tokenID];

        require(auction.creator != address(0), 'WellMarket: Auction not found or inactive');
        if(block.timestamp < auction.endDate)
            revert CannotEndAuctionYet();

        delete activeAuction[nftAddress][tokenID];
    }

    /*
    function getAuction(IERC721 nftAddress, uint256 tokenID) external view returns (uint256) {
        return 3;
    }
     */

    function _returnLatestBid(IERC721 nftAddress, uint256 tokenID) internal {
        Bid memory latestBid = activeBids[nftAddress][tokenID];
        address payable bidder = payable(latestBid.bidder);

        if(bidder != address(0)) {
            if(latestBid.currency.isEther)
                bidder.transfer(latestBid.amount);
            else {
                IERC20(latestBid.currency._address).transfer(bidder, latestBid.amount);
            }
        }
    }

   function _bid(IERC721 nftAddress, uint256 tokenID, IERC20 tokenAddress, uint256 bidAmount) internal {
       Auction memory auction = activeAuction[nftAddress][tokenID];
       Bid storage activeBid_ = activeBids[nftAddress][tokenID];

       address bidder = msg.sender;

       require(auction.nft.tokenContract != IERC721(address(0)), 'WellMarket: NFT not in active auction');
       require(tokenAddress == auction.currency._address, 'WellMarket: Bid currency must match auction currency');

       if(bidAmount <= activeBid_.amount)
           revert BidTooLow(activeBid_.amount, bidAmount);

       Currency memory currency;
       currency._address = tokenAddress;

       if(tokenAddress == IERC20(address(0))) {
           currency.isEther = true;
       }

       Bid memory newBid = Bid(bidAmount, currency, auction, bidder);
       activeBids[nftAddress][tokenID] = newBid;

       // Return previous active bid to previous bidder.
       if(activeBid_.amount != 0)
           _returnLatestBid(nftAddress, tokenID);

       // Transfer erc20 token in bid to contract.
       if(tokenAddress != IERC20(address(0)))
           IERC20(tokenAddress).transferFrom(msg.sender, address(this), bidAmount);
   }

   function bid(IERC721 nftAddress, uint256 tokenID) external payable {
       uint256 amount = msg.value;
       _bid(nftAddress, tokenID, IERC20(address(0)), amount);
   }

   function bid(IERC721 nftAddress, uint256 tokenID, IERC20 tokenAddress, uint256 tokenAmount) external {
       require(tokenAddress != IERC20(address(0)));
       require(tokenAmount != 0, 'WellMarket: Cannot bid zero');

       _bid(nftAddress, tokenID, tokenAddress, tokenAmount);
   }
}
