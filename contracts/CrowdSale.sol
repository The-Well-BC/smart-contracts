// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
import "openzeppelin-2.5/crowdsale/emission/MintedCrowdsale.sol";
import "openzeppelin-2.5/crowdsale/validation/WhitelistCrowdsale.sol";

contract WellTokenCrowdsale is Crowdsale, MintedCrowdsale, WhitelistCrowdsale {
    constructor(_rate, _wallet, _token) Crowdsale(_rate, _wallet, _token) {
    }
}
