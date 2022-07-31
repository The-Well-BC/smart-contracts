// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import {Marketplace} from "../../contracts/Marketplace.sol";
import {ContractState} from './ContractState.sol';
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

// Mock marketplace will facilitate unit testing
contract MockMarketplace is Marketplace, ContractState {
    address user1;

    constructor() Marketplace(msg.sender) {
        user1 = msg.sender;
    }

    function _setAuctions(IERC721 nftAddr, uint256 tokenID, Auction[] memory auctions_) external {
        // auctions[nftAddr][tokenID] = auctions_;
        for(uint i=0; i<auctions_.length; i++) {
            _addAuction(nftAddr, tokenID, auctions_[i]);
        }
    }

    function _addAuction(IERC721 nftAddr, uint256 tokenID, Auction memory auction_) public {
        auctions[nftAddr][tokenID].push(auction_);
    }

    function _setActiveAuction(Auction memory auction_) external {
        IERC721 nftAddr = auction_.nft.tokenContract;
        uint tokenID = auction_.nft.tokenID;
        _addAuction(nftAddr, tokenID, auction_);
        activeAuction[nftAddr][tokenID] = auction_;
    }

    function _setActiveBid(Bid memory bid_) external {
        Auction memory auction_ = bid_.auction;
        IERC721 nftAddr = auction_.nft.tokenContract;
        uint tokenID = auction_.nft.tokenID;

        activeBids[nftAddr][tokenID] = bid_;
    }

    /*
    // function _setState_Auction(IERC721 address_,  mapping(uint256=>Auction) calldata auctions_ ) external {
    function _setState_Auction(string memory fnName, IERC721 address_,  Auction[] calldata auction_ ) external {
    // function _setState_Auction(IERC721 address_,  mapping(uint256 => uint256) calldata auction_ ) external {
        // auctions[address_] = auctions_;
        // auctions[address_][3] = auction_;
        this[fnName] = 'boo';
    }
    */
}
