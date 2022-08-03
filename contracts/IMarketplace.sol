// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IMarketplace {
    struct NFT {
        IERC721 tokenContract;
        uint256 tokenID;
    }

    struct Currency {
        bool isEther;
        IERC20 _address;
    }

    struct Auction {
        NFT nft;
        address creator;
        Currency currency;
        uint256 endDate;
        uint256 reservePrice;
        uint256 reserveDuration;
    }

    struct Bid {
        uint256 amount;
        Currency currency;
        Auction auction;
        address bidder;
    }

    /**
      * Auction:

      * NFT contract;
      * NFT tokenID;
      * auction state;
      * start_tine;
      * end_time
      */

     // An NFT can only be in one active auction, whether reserve, or normal auction.

    function createAuction(IERC721 nftAddress, uint256 tokenID, IERC20 currencyAddress) external;

    function createReserveAuction(IERC721 nftAddress, uint256 tokenID, IERC20 currencyAddress, uint256 reservePrice, uint256 reserveDuration) external;

    function endAuction(IERC721 nftAddress, uint256 tokenID) external;

    // function getActiveAuction(IERC721 nftAddress, uint256 tokenID) external view returns ;
}
