// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Context.sol";

contract WhitelistCrowdsale is Context {
    // Whitelisted buyers
    mapping(address => bool) public whitelist;

    // Owner address
    address private owner;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner {
        require(msg.sender == owner, 'Owner only function');
         _;
    }

    modifier isWhitelisted(address beneficiary_) {
        require(whitelist[beneficiary_] == true, 'Crowdsale: Address not allowed to buy token');
        _;
    }

    function addToWhitelist(address beneficiary_) external onlyOwner {
        whitelist[beneficiary_] = true;
    }

    function removeFromWhitelist(address beneficiary_) external onlyOwner {
        whitelist[beneficiary_] = false;
    }
}
