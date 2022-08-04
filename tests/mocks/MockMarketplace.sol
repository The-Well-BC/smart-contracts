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

    function _setActiveAuction(Auction memory auction_) external {
        IERC721 nftAddr = auction_.nft.tokenContract;
        uint tokenID = auction_.nft.tokenID;
        activeAuction[nftAddr][tokenID] = auction_;
    }

    function _setActiveBid(Bid memory bid_) external {
        Auction memory auction_ = bid_.auction;
        IERC721 nftAddr = auction_.nft.tokenContract;
        uint tokenID = auction_.nft.tokenID;

        activeBids[nftAddr][tokenID] = bid_;
    }
}
