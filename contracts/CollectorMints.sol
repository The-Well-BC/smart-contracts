// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Fresh is ERC20{
    constructor() ERC20('FRESH', 'FRESH') {
    }
}
