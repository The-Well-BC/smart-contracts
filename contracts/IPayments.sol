// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title PaymentSplitter
 * @dev PaymentSplitter for ERC721 contract. Will work with TheWellNFT. Each token has it's own set of payees[tokenId].
 *
 */
interface IPayments {
    event PayeeAdded(uint256 tokenId, address account, uint256 shares);
    event PaymentReleased(uint256 tokenId, address to, uint256 amount);
    event PaymentReceived(uint256 tokenId, address from, uint256 amount);
    event PaymentReceivedERC20(uint256 tokenId, address from, uint256 amount, address currency);

    struct Payee {
        address _address;
        uint8 shares;
        uint256 released;
    }

    /**
     * @dev setShares can only be set once
     *
     * Creates an instance of `PaymentSplitter` where each account in `payees` is assigned the number of shares at
     * the matching position in the `shares` array.
     *
     * All addresses in `payees` must be non-zero. Both arrays must have the same non-zero length, and there must be no
     * duplicates in `payees`.
     */
    function setShares( uint256 tokenId_, address[] memory payees_, uint256[] memory shares_) external;

    function receivePaymentETH(uint256 tokenId) external payable;

    function receiveERC20Payment(uint256 tokenID, address buyer, uint256 paymentAmount, IERC20 paymentToken) external returns(bool);

    /**
     * @dev The Ether received will be logged with {PaymentReceived} events. Note that these events are not fully
     * reliable: it's possible for a contract to receive Ether without triggering this function. This only affects the
     * reliability of the events, and not the actual splitting of Ether.
     *
     * To learn more about this see the Solidity documentation for
     * https://solidity.readthedocs.io/en/latest/contracts.html#fallback-function[fallback
     * functions].
     */
    receive() external payable;

    /**
     * @dev Getter for the total shares held by payees[tokenId].
     */
    function totalShares(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Getter for the total amount of Ether already released.
     */
    function totalReleased(uint256 tokenId) external view returns (uint256);

    /**
     * @dev Getter for the amount of shares held by an account.
     */
    function shares(uint256 tokenId, address account) external view returns (uint256);

    /**
     * @dev Getter for the amount of Ether already released to a payee.
     */
    function released(uint256 tokenId, address account) external view returns (uint256);

    /**
     * @dev Getter for the address of the payee number `index`.
     */
    function payee(uint256 tokenId, uint256 index) external view returns (address);

    /**
     * @dev Getter for the address of the payee number `index`.
     */
    function payees(uint256 tokenId) external view returns (address[] memory);

    /**
     * @dev Returns payee shares and balance
     */
    function payeeDetails(uint256 tokenId, address account) external view
        returns (address, uint256, uint256);
}
