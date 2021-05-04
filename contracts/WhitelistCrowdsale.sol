// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract WhitelistCrowdsale {
    uint256 private _rate;
    address payable private _wallet;
    IERC20 private _token;

    // Whitelisted buyers
    mapping(address => bool) public whitelist;

    constructor(rate_, wallet_, token_) {
        require(rate_ > 0, 'Crowdsale: rate must be greater than 0');
        require(wallet_ != address(0), 'Crowdsale: wallet is the zero address');
        require(address(token_) != address(0), 'Crowdsale: token is the zero address');

        _rate = rate_;
        _wallet = wallet_;
        _token = token_;
    }

    function token() external view returns(IERC20) {
        return _token;
    }

    function wallet() external view returns(address payable) {
        return _wallet;
    }

    function rate() external view returns(uint256) {
        return _rate;
    }


    modifier onlyOwner {
        require(msg.sender == owner, 'Owner only function');
         _;
    }

    /* Whitelist Functions */

    modifier isWhitelisted(address beneficiary_) {
        require(whitelist[beneficiary_] == true, 'Crowdsale: Address not allowed to buy token');
        _;
    }

    function addToWhitelist(address beneficiary_) external onlyOwner {
        whitelist[beneficiary_] = true;
    }

    event TokensPurchased(purchaser, beneficiary, value, amount);


    function _getTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        return weiAmount.mul(_rate);
    }

    /**
    buyTokens function
    */
    function buyTokens(address beneficiary_) external payable isWhitelisted(beneficiary_) {
        uint256 weiAmount = msg.value;
        _prevalidatePurchase(beneficiary_, weiAmount);

        uint256 tokens = _getTokenAmount(weiAmount);

        _weiRaised = _weiRaised.add(weiAmount);

        _updatePurchasingState(beneficuary, weiAmount);

        _forwardFunds();
        emit TokensPuchased(msg.sender, beneficiary, weiAmount, tokens);
        _postValidatePurchase(beneficuary, weiAmount);
    }

    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        require(beneficiary != address(0), "Crowdsale: beneficiary is the zero address");
        require(weiAmount != 0, "Crowdsale: weiAmount is 0");
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
    }

    /**
      Sends ETH to wallet 
     */
    function _forwardFunds() internal {
        _wallet.transfer(msg.value);
    }
    function () external payable {
        buyTokens(_msgSender());
    }
}
