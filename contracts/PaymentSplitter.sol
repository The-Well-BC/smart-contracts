// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import { IPayments } from './IPayments.sol';
import './Admin.sol';
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title PaymentSplitter
 * @dev PaymentSplitter for ERC721 contract. Will work with TheWellNFT. Each token has it's own set of payees[tokenId].
 *
 */
contract TheWellPaymentSplitter is IPayments, Context, ReentrancyGuard, WellAdmin {
    using SafeERC20 for IERC20;

    struct ERC20Balance{
        address addr;
        uint256 balance;
    }

    // Mapping of tokenId to total shares of token
    mapping(uint256 => uint256) private _totalShares;
    // Mapping of tokenId to total amount of eth released to token payees
    mapping(uint256 => uint256) private _totalReleased;

    // Mapping of tokenId to mapping of payee address to amount of shares belong to payee
    mapping(uint256 => mapping(address => uint256)) internal _shares;

    // Mapping of tokenId to mapping of payee address to check if shares added to payee
    mapping(uint256 => mapping(address => bool)) internal _sharesAddded;

    // Mapping of tokenId to mapping of payee address to amount released to payee
    mapping(uint256 => mapping(address => uint256)) private _released;

    // Mapping of tokenId to array of token payees ie (collaborators)
    mapping(uint256 => address[]) internal _payees;

    mapping(uint => uint) internal paymentForToken;

    // ERC20 array
    IERC20[] public erc20Arr;

    // Mapping ERC20 to token id to erc20 balance for that token
    mapping(IERC20 => mapping(uint => uint256)) internal erc20PaymentsReceived;

    mapping(uint256 => mapping(address => Payee)) internal payeeMapping;

    mapping (uint => mapping(address => bool))paymentReleased;

    address nftContractAddress;
    
    address marketplaceContract;

    /**
     * @dev Checks that shares have been set.
     */
    modifier checkShares(uint256 tokenId) {
        require(
            _payees[tokenId].length > 0,
            "PaymentSplitter: no shares set, use setShares()"
        );
        _;
    }

    modifier nftContractOnly() {
        require(msg.sender == nftContractAddress);
        _;
    }

    modifier  marketplaceContractOnly() {
        require(msg.sender ==  marketplaceContract);
        _;
    }
    function maxTenShares(address[] memory arr) private returns(bool){
        return arr.length <= 10;
    }

    function setNFTContract(address nftContractAddress_) external wellAdmin {
        nftContractAddress = nftContractAddress_;
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
    function setShares(
        uint256 tokenId_,
        address[] memory payees_,
        uint256[] memory shares_
    ) external nftContractOnly override {
        // Can only be set once
        require(_payees[tokenId_].length == 0, "You can only set shares once");

        require(payees_.length > 0, "PaymentSplitter: no payees_");
        require(maxTenShares(payees_));

        require(
            payees_.length == shares_.length,
            "PaymentSplitter: payees_ and shares length mismatch"
        );

        for (uint256 i = 0; i < payees_.length; i++) {
            _addPayee(tokenId_, payees_[i], shares_[i]);
        }
    }

    function receivePaymentETH(uint256 tokenId) external payable marketplaceContractOnly checkShares(tokenId) {
        paymentForToken[tokenId] = msg.value;

        emit PaymentReceived(tokenId, _msgSender(), msg.value);
    }

    /**
      * @dev receives payment in the form of ERC20 tokens
      */
    function receiveERC20Payment(uint256 tokenID, address buyer, uint256 paymentAmount, IERC20 paymentToken) external override marketplaceContractOnly returns(bool) {
        // Check that payees for that token exist
        require(_payees[tokenID].length > 0);

        IERC20(paymentToken).safeTransferFrom(buyer, address(this), paymentAmount);

        erc20PaymentsReceived[paymentToken][tokenID] = paymentAmount;

        emit PaymentReceivedERC20(tokenID, buyer, paymentAmount, address(paymentToken));
        return true;
    }

    /**
     * @dev The Ether received will be logged with {PaymentReceived} events. Note that these events are not fully
     * reliable: it's possible for a contract to receive Ether without triggering this function. This only affects the
     * reliability of the events, and not the actual splitting of Ether.
     *
     * To learn more about this see the Solidity documentation for
     * https://solidity.readthedocs.io/en/latest/contracts.html#fallback-function[fallback
     * functions].
     */
    receive() external payable virtual override {
        revert();
    }

    /**
     * @dev Getter for the total shares held by payees[tokenId].
     */
    function totalShares(uint256 tokenId) public view override
        checkShares(tokenId)
        returns (uint256)
    {
        return _totalShares[tokenId];
    }

    /**
     * @dev Getter for the total amount of Ether already released.
     */
    function totalReleased(uint256 tokenId) public view override
        checkShares(tokenId)
        returns (uint256)
    {
        return _totalReleased[tokenId];
    }

    /**
     * @dev Getter for the amount of shares held by an account.
     */
    function shares(uint256 tokenId, address account) public view override
        checkShares(tokenId)
        returns (uint256)
    {
        return _shares[tokenId][account];
    }

    /**
     * @dev Getter for the amount of Ether already released to a payee.
     */
    function released(uint256 tokenId, address account) public view override
        checkShares(tokenId)
        returns (uint256)
    {
        return _released[tokenId][account];
    }

    /**
     * @dev Getter for the address of the payee number `index`.
     */
    function payee(uint256 tokenId, uint256 index) public view override
        checkShares(tokenId)
        returns (address)
    {
        return _payees[tokenId][index];
    }

    function payees(uint256 tokenId) public view override
        checkShares(tokenId)
        returns (address[] memory)
    {
        return _payees[tokenId];
    }

    /**
     * @dev Returns payee shares and balance
     */
    function payeeDetails(uint256 tokenId, address account) public view override
        checkShares(tokenId)
        returns (address, uint256, uint256)
    {
        Payee memory p = payeeMapping[tokenId][account];

        uint256 balance =
            ((address(this).balance * p.shares) / _totalShares[tokenId]) -
            p.released;

        return (p._address, uint256(p.shares), balance);
    }

    /**
     * @dev Triggers a transfer to `account` of the amount of Ether they are owed, according to their percentage of the
     * total shares and their previous withdrawals.
     */
    function releaseETH(uint256 tokenId, address payable account)
        external virtual
        checkShares(tokenId)
        nonReentrant
    {
        require(paymentReleased[tokenId][account] != true);
        require(
            _shares[tokenId][account] > 0,
            "PaymentSplitter: account has no shares"
        );

        uint256 payment =
            (paymentForToken[tokenId] * _shares[tokenId][account]) /
            _totalShares[tokenId];

        require(payment != 0, "PaymentSplitter: account not due payment");

        _released[tokenId][account] = _released[tokenId][account] + payment;
        _totalReleased[tokenId] = _totalReleased[tokenId] + payment;
        payeeMapping[tokenId][account].released = _released[tokenId][account];

        paymentReleased[tokenId][account] = true;
        Address.sendValue(account, payment);
        emit PaymentReleased(tokenId, account, payment);
    }

    function releaseToken(uint256 tokenId, address payable account, IERC20 paymentToken)
        external virtual
        checkShares(tokenId)
        nonReentrant
    {
        require(paymentReleased[tokenId][account] != true);
        require(
            _shares[tokenId][account] > 0,
            "PaymentSplitter: account has no shares"
        );

        uint256 payment = (
            erc20PaymentsReceived[paymentToken][tokenId] * _shares[tokenId][account]
        ) /
            _totalShares[tokenId];

        require(payment != 0, "PaymentSplitter: account not due payment with this token");

        _released[tokenId][account] = _released[tokenId][account] + payment;
        _totalReleased[tokenId] = _totalReleased[tokenId] + payment;
        payeeMapping[tokenId][account].released = _released[tokenId][account];

        paymentReleased[tokenId][account] = true;
        paymentToken.safeTransfer(account, payment);
        emit PaymentReleased(tokenId, account, payment);
    }

    /**
     * @dev Add a new payee to the contract.
     * @param account The address of the payee to add.
     * @param shares_ The number of shares owned by the payee.
     */
    function _addPayee( uint256 tokenId, address account, uint256 shares_) private {
        require(
            account != address(0),
            "PaymentSplitter: account is zero address"
        );
        require(
            _sharesAddded[tokenId][account] == false,
            "PaymentSplitter: account already has shares"
        );
        require(_totalShares[tokenId] + shares_ <= 100);

        _payees[tokenId].push(account);

        payeeMapping[tokenId][account] = Payee(account, uint8(shares_), 0);

        _sharesAddded[tokenId][account] = true;
        _shares[tokenId][account] = shares_;
        _totalShares[tokenId] = _totalShares[tokenId] + shares_;
        emit PayeeAdded(tokenId, account, shares_);
    }
}
