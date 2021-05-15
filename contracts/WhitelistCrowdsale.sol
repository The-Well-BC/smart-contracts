// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ERC20Minter.sol";

// TODO: Handle sale of both WELL and mint tokens to collectors.
contract WhitelistCrowdsale is Context, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // The token being sold
    IERC20 private _wellToken;
    IERC20 private _freshToken;

    // Address where funds are collected
    address payable private _wallet;

    // Whitelisted buyers
    mapping(address => bool) public whitelist;

    // Owner address
    address private owner;

    // How many token units a buyer gets per wei.
    // The rate is the conversion between wei and the smallest and indivisible token unit.
    // So, if you are using a rate of 1 with a ERC20Detailed token with 3 decimals called TOK
    // 1 wei will give you 1 unit, or 0.001 TOK.
    uint256 private _rate;

    // Amount of wei raised
    uint256 private _weiRaised;

    /**
     * Event for token purchase logging
     * @param purchaser who paid for the tokens
     * @param beneficiary who got the tokens
     * @param value weis paid for purchase
     * @param amount amount of tokens purchased
     */
    event TokensPurchased(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

    /**
     * @dev The rate is the conversion between wei and the smallest and indivisible
     * token unit. So, if you are using a rate of 1 with a ERC20Detailed token
     * with 3 decimals called TOK, 1 wei will give you 1 unit, or 0.001 TOK.
     * @param wallet_ Address where collected funds will be forwarded to
     * @param wellToken_ Address of the $WELL token
     * @param freshToken_ Address of the $FRESH token
     * @param tokensPerWei_ Number of tokens to be sold per wei
     */

    constructor(uint256 tokensPerWei_, address payable wallet_, IERC20 wellToken_, IERC20 freshToken_) {
        require(tokensPerWei_ > 0, 'Crowdsale: tokensPerWei must be greater than 0');
        require(wallet_ != address(0), 'Crowdsale: wallet is the zero address');
        require(address(wellToken_) != address(0), 'Crowdsale: $WELL token is the zero address');
        require(address(freshToken_) != address(0), 'Crowdsale: $FRESH token is the zero address');

        _rate = tokensPerWei_;
        _wallet = wallet_;
        _wellToken = wellToken_;
        _freshToken = freshToken_;

        owner = msg.sender;
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     * Note that other contracts will transfer funds with a base gas stipend
     * of 2300, which is not enough to call buyTokens. Consider calling
     * buyTokens directly when purchasing tokens from a contract.
     */
    fallback() external payable {
        buyTokens(_msgSender());
    }
    receive() external payable {
        buyTokens(_msgSender());
    }

    /**
     * @return the token being sold.
     */
    function token() public view returns (IERC20) {
        return _wellToken;
    }

    /**
     * @return the address where funds are collected.
     */
    function wallet() public view returns (address payable) {
        return _wallet;
    }

    /**
     * @return the number of token units a buyer gets per wei.
     */
    function rate() public view returns (uint256) {
        return _rate;
    }

    /**
     * @return the amount of wei raised.
     */
    function weiRaised() public view returns (uint256) {
        return _weiRaised;
    }

    modifier onlyOwner {
        require(msg.sender == owner, 'Owner only function');
         _;
    }

    /* Whitelist Functions */
    /**
      * @dev Checks that buyer is whitelisted
      */
    modifier isWhitelisted(address beneficiary_) {
        require(whitelist[beneficiary_] == true, 'Crowdsale: Address not allowed to buy token');
        _;
    }

    function addToWhitelist(address beneficiary_) external onlyOwner {
        whitelist[beneficiary_] = true;
    }

    /**
     * @dev low level token purchase ***DO NOT OVERRIDE***
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     * @param beneficiary Recipient of the token purchase
     */
    function buyTokens(address beneficiary) public nonReentrant payable isWhitelisted(beneficiary) {
        uint256 weiAmount = msg.value;
        _preValidatePurchase(beneficiary, weiAmount);

        // calculate token amount to be created
        uint256 well = _getWellTokenAmount(weiAmount);
        uint256 fresh = _getFreshTokenAmount(weiAmount);

        // update state
        _weiRaised = _weiRaised + weiAmount;

        _processPurchase(beneficiary, well, fresh);
        emit TokensPurchased(_msgSender(), beneficiary, weiAmount, well);

        _updatePurchasingState(beneficiary, weiAmount);

        _forwardFunds();
        _postValidatePurchase(beneficiary, weiAmount);
    }

    /**
     * @dev Validation of an incoming purchase. Use require statements to revert state when conditions are not met.
     * Use `super` in contracts that inherit from Crowdsale to extend their validations.
     * Example from CappedCrowdsale.sol's _preValidatePurchase method:
     *     super._preValidatePurchase(beneficiary, weiAmount);
     *     require(weiRaised().add(weiAmount) <= cap);
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _preValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        require(beneficiary != address(0), "Crowdsale: beneficiary is the zero address");
        require(weiAmount != 0, "Crowdsale: weiAmount is 0");
        this; // silence state mutability warning without generating bytecode - see https://github.com/ethereum/solidity/issues/2691
    }

    /**
     * @dev Validation of an executed purchase. Observe state and use revert statements to undo rollback when valid
     * conditions are not met.
     * @param beneficiary Address performing the token purchase
     * @param weiAmount Value in wei involved in the purchase
     */
    function _postValidatePurchase(address beneficiary, uint256 weiAmount) internal view {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Source of tokens. Override this method to modify the way in which the crowdsale ultimately gets and sends
     * its tokens.
     * @param beneficiary Address performing the token purchase
     * @param well Number of well tokens to be emitted
     * @param fresh Number of fresh tokens to be emitted
     */
    function _deliverTokens(address beneficiary, uint256 well, uint256 fresh) internal {
        // Potentially dangerous assumption about the type of the token.
        ERC20Minter(address(_wellToken)).mint(beneficiary, well);
        ERC20Minter(address(_freshToken)).mint(beneficiary, fresh);
            /*
        require(
            ERC20Minter(address(token())).mint(beneficiary, tokenAmount) == true,
            "MintedCrowdsale: minting failed"
        );
            */
            // ERC20Minter(address(token())).mint(beneficiary, tokenAmount),
    }

    /**
     * @dev Executed when a purchase has been validated and is ready to be executed. Doesn't necessarily emit/send
     * tokens.
     * @param beneficiary Address receiving the tokens
     * @param well Number of well tokens to be purchased
     */
    function _processPurchase(address beneficiary, uint256 well, uint256 fresh) internal {
        _deliverTokens(beneficiary, well, fresh);
    }

    /**
     * @dev Override for extensions that require an internal state to check for validity (current user contributions,
     * etc.)
     * @param beneficiary Address receiving the tokens
     * @param weiAmount Value in wei involved in the purchase
     */
    function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @dev Override to extend the way in which ether is converted to tokens.
     * @param weiAmount Value in wei to be converted into tokens
     * @return Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getWellTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        return weiAmount * _rate;
    }
    function _getFreshTokenAmount(uint256 weiAmount) internal view returns (uint256) {
        return 5 * (10 ** 18);
    }

    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() internal {
        _wallet.transfer(msg.value);
    }
}
