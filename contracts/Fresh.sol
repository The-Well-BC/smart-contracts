// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
import "./ERC20Minter.sol";

contract Fresh is ERC20Minter{
    constructor() ERC20Minter('Fresh Mints', 'FRESH') {
    }
}
