// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// TODO: Handle sale of both WELL and mint tokens to collectors.
contract WhitelistCrowdsale is Context {
    // Whitelisted buyers
    mapping(address => bool) public whitelist;

    // Owner address
    address private owner;

    /**
     * @dev The rate is the conversion between wei and the smallest and indivisible
     * token unit. So, if you are using a rate of 1 with a ERC20Detailed token
     * with 3 decimals called TOK, 1 wei will give you 1 unit, or 0.001 TOK.
     */

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner, 'Owner only function');
         _;
    }

    /* Whitelist Functions */
    /**
      * @dev Checks that buyer is whitelisted
      */
    modifier isWhitelisted(address beneficiary_) {
        require(whitelist[beneficiary_] == true, 'Crowdsale: Address not allowed to buy token');
        _;
    }

    function addToWhitelist(address beneficiary_) external onlyOwner {
        whitelist[beneficiary_] = true;
    }
}
