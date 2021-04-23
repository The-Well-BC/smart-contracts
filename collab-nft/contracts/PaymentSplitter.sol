// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title PaymentSplitter
 * @dev This contract is based on OpenZeppelin's payment splitter.
 *
 * Differences include:
 * - Deleted constructor
 * - _setShares() was added
 * - _checkShares() was added
 * - _addPayees no longer be called in the constructor
 *
 */
contract PaymentSplitter is Context {
    event PayeeAdded(address account, uint256 shares);
    event PaymentReleased(address to, uint256 amount);
    event PaymentReceived(address from, uint256 amount);

    uint256 private _totalShares;
    uint256 private _totalReleased;

    mapping(address => uint256) internal _shares;
    mapping(address => uint256) private _released;
    address[] internal _payees;

    mapping(address => Payee) internal payeeMapping;

    struct Payee{
        address _address;
        uint8 shares;
        uint256 released;
    }

    /**
      * @dev Checks that shares have been set.
      */
     modifier checkShares() {
         require(
             _payees.length > 0,
             'PaymentSplitter: You have to set the payees and their share percentages first. Use _setShares()'
         );
         _;
     }

    /**
     * @dev _setShares can only be set once
     * 
     * Creates an instance of `PaymentSplitter` where each account in `payees` is assigned the number of shares at
     * the matching position in the `shares` array.
     *
     * All addresses in `payees` must be non-zero. Both arrays must have the same non-zero length, and there must be no
     * duplicates in `payees`.
     */
    function _setShares(address[] memory payees, uint256[] memory shares_) internal {
        // Can only be set once
        require(
            _payees.length == 0,
            'You can only set shares once'
        );

        require(payees.length == shares_.length, "PaymentSplitter: payees and shares length mismatch");
        require(payees.length > 0, "PaymentSplitter: no payees");

        for (uint256 i = 0; i < payees.length; i++) {
            _addPayee(payees[i], shares_[i]);
        }
    }

    function receivePayment() internal checkShares {
        emit PaymentReceived(_msgSender(), msg.value);
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
    receive () external payable virtual {
        receivePayment();
    }

    /**
     * @dev Getter for the total shares held by payees.
     */
    function totalShares() public view checkShares returns (uint256) {
        return _totalShares;
    }

    /**
     * @dev Getter for the total amount of Ether already released.
     */
    function totalReleased() public view checkShares returns (uint256) {
        return _totalReleased;
    }

    /**
     * @dev Getter for the amount of shares held by an account.
     */
    function shares(address account) public view checkShares returns (uint256) {
        return _shares[account];
    }

    /**
     * @dev Getter for the amount of Ether already released to a payee.
     */
    function released(address account) public view checkShares returns (uint256) {
        return _released[account];
    }

    /**
     * @dev Getter for the address of the payee number `index`.
     */
    function payee(uint256 index) public view checkShares returns (address) {
        return _payees[index];
    }

    /**
      * @dev Returns payee shares and balance
      */
    function payeeDetails(address account) public view checkShares returns (address, uint256, uint256) {
        Payee memory p = payeeMapping[account];

        uint256 balance = (address(this).balance * p.shares / _totalShares) - p.released;

        return (p._address, uint256(p.shares), balance);
    }

    /**
     * @dev Triggers a transfer to `account` of the amount of Ether they are owed, according to their percentage of the
     * total shares and their previous withdrawals.
     */
    function release(address payable account) public virtual checkShares {
        require(_shares[account] > 0, "PaymentSplitter: account has no shares");

        uint256 totalReceived = address(this).balance + _totalReleased;
        uint256 payment = totalReceived * _shares[account] / _totalShares - _released[account];

        require(payment != 0, "PaymentSplitter: account is not due payment");

        _released[account] = _released[account] + payment;
        _totalReleased = _totalReleased + payment;

        Address.sendValue(account, payment);
        emit PaymentReleased(account, payment);
    }

    /**
     * @dev Add a new payee to the contract.
     * @param account The address of the payee to add.
     * @param shares_ The number of shares owned by the payee.
     */
    function _addPayee(address account, uint256 shares_) private {
        require(account != address(0), "PaymentSplitter: account is the zero address");
        require(shares_ > 0, "PaymentSplitter: shares are 0");
        require(_shares[account] == 0, "PaymentSplitter: account already has shares");

        _payees.push(account);

        payeeMapping[account] = Payee(account, uint8(shares_), 0);

        _shares[account] = shares_;
        _totalShares = _totalShares + shares_;
        emit PayeeAdded(account, shares_);
    }
}
