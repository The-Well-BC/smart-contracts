// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./ERC20Minter.sol";
// import "@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol";

contract Well is ERC20Minter {
    string private _name;

    constructor() ERC20Minter('The Well', 'WELL'){
    }
}
