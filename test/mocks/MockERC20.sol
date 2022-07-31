// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * Mock ERC20 for testing
 * tokens 1-6 are created on contract initialization
 * tokens 1, 3, and 5 are approved
 */
contract MockERC20 is ERC20 {
    /**
     * @dev Initializes the contract by setting a `name` and a `symbol` to the token collection.
     */
    constructor () ERC20('Mock ERC20', 'MOCK') {
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    function transferFrom(address sender, address recipient, uint256 amount) public virtual override returns (bool) {
        _approve(sender, recipient, amount);
        return super.transferFrom(sender, recipient, amount);
    }
}

