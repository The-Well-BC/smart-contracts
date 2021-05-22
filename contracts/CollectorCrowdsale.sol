// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./ERC20Minter.sol";
import './WhitelistCrowdsale.sol';

contract CollectorCrowdsale is ReentrancyGuard, WhitelistCrowdsale {
     using SafeERC20 for IERC20;

    // Package sold in crowdsale contract
    struct Package{
        string name;
        PackageToken[] tokens;
        uint256 priceInWEI;
    }

    // Token object to be used in packages
    struct PackageToken {
        IERC20 _address;
        uint256 amount;
    }
    // Package ID to Package mapping
    mapping(uint256 => Package) _packages;
    uint256[] _packageIDs;
    uint nextPackageID;

    // Address where funds are collected
    address payable private _wallet;

    // Owner address
    address private owner;

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
     * @param wallet_ Address where collected funds will be forwarded to
     */

    constructor(address payable wallet_) {
        require(wallet_ != address(0), 'Crowdsale: wallet is the zero address');

        _wallet = wallet_;

        owner = msg.sender;
        nextPackageID = 1;
    }

    /**
      * @dev Adds a new package to crowdsale contract
      * param name_ - Name of the package
      * param priceInWEI_ - Price of the package
      * returns packageID - ID of the new package
      */

    event NewPackage(string name_, uint ID);

    function addPackage(string memory name_, uint256 priceInWEI_, address[] memory tokenAddresses, uint256[] memory tokenAmounts)
        external onlyOwner
    {
        require(tokenAddresses.length >= 1,
                'At least one token required'
        );
        require(tokenAddresses.length == tokenAmounts.length,
                'tokenAddresses array and tokenAmounts must have equal length'
        );
        require(tokenAddresses.length <= 10,
                'Max of 10 tokens required'
        );

        _packages[nextPackageID].name = name_;
        _packages[nextPackageID].priceInWEI = priceInWEI_;

        for(uint i = 0; i < tokenAddresses.length; i++) {
            _packages[nextPackageID].tokens.push(
                PackageToken(IERC20(tokenAddresses[i]), tokenAmounts[i])
            );
        }

        emit NewPackage(name_, nextPackageID);
        _packageIDs.push(nextPackageID);

        nextPackageID++;
    }

    /**
     * @dev returns the tokens contained in a package
     * @param packageID - ID of the package for which tokens are being requested
     * @return tokens_ - the addresses of tokens being sold.
     */
    function tokens(uint256 packageID) public view returns (address[] memory tokens_) {
        Package memory package_ = _packages[packageID];
        uint256 tokenLength = package_.tokens.length;

        assert(tokenLength <= 10);

        tokens_ = new address[](package_.tokens.length);

        for(uint256 i = 0; i < 10; i++) {
            tokens_[i] = address(package_.tokens[i]._address);
        }

        return tokens_;
    }

    /**
     * @return the address where funds are collected.
     */
    function wallet() public view returns (address payable) {
        return _wallet;
    }

    /**
     * @return name_ of the package belong to packageID
     * @return tokens_ the token addresses (tokens_) included in the package
     * @return tokenAmounts_ and token amounts a buyer gets when they purchase a package.
     */
    function package(uint256 packageID) public view
        returns (string memory name_, IERC20[] memory tokens_, uint256[] memory tokenAmounts_)
    {
        PackageToken[] memory tokenArr = _packages[packageID].tokens;
        tokens_ = new IERC20[](tokenArr.length);
        tokenAmounts_ = new uint256[](tokenArr.length);

        for(uint256 i = 0; i < tokenArr.length; i++) {
            tokens_[i] = tokenArr[i]._address;
            tokenAmounts_[i] = tokenArr[i].amount;
        }

        return (_packages[packageID].name, tokens_, tokenAmounts_);
    }

    /**
     * @return IDs - Package IDs
     * @return prices_ - array of package prices
     */
    function packages() public view returns (uint[] memory IDs, uint[] memory prices_) {
        prices_ = new uint[](_packageIDs.length);

        for(uint256 i = 0; i < _packageIDs.length; i++) {
            prices_[i] = _packages[_packageIDs[i]].priceInWEI;
        }

        return (_packageIDs, prices_);
    }

    /**
     * @return the amount of wei raised.
     */
    function weiRaised() public view returns (uint256) {
        return _weiRaised;
    }

    /**
     * @dev low level token purchase
     * This function has a non-reentrancy guard, so it shouldn't be called by
     * another `nonReentrant` function.
     * @param beneficiary Recipient of the token purchase
     */
    function buyTokens(address beneficiary, uint256 packageID) public nonReentrant payable isWhitelisted(beneficiary) {
        uint256 weiAmount = msg.value;
        _preValidatePurchase(beneficiary, weiAmount, packageID);

        // calculate token amount to be created
        PackageToken[] memory tokens_ = _getTokens(packageID);

        // update state
        _weiRaised = _weiRaised + weiAmount;

        _processPurchase(beneficiary, tokens_);

        for(uint256 i = 0; i < tokens_.length; i++) {
            emit TokensPurchased(_msgSender(), beneficiary, weiAmount, tokens_[i].amount);
        }

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
    function _preValidatePurchase(address beneficiary, uint256 weiAmount, uint256 packageID) internal view {
        require(beneficiary != address(0), "Crowdsale: beneficiary is the zero address");
        require(weiAmount != 0, "Crowdsale: weiAmount is 0");
        require(_packages[packageID].priceInWEI == weiAmount, 'Payment amount should equal price of the package');
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
     * @dev Source of tokens.
     * @param beneficiary Address performing the token purchase
     * @param tokens_ Array of tokens {Token} to be delivered. The amount of tokens to be minted will be fetched
     * from the packageTokenAmounts mapping
     */
    function _deliverTokens(address beneficiary, PackageToken[] memory tokens_) internal {
        // Potentially dangerous assumption about the type of the token.
        for(uint256 i = 0; i < tokens_.length; i++) {
            ERC20Minter(address(tokens_[i]._address)).mint(beneficiary, tokens_[i].amount);
        }
        /*
        require(
            ERC20Minter(address(token())).mint(beneficiary, tokenAmount) == true,
            "MintedCrowdsale: minting failed"
        );
        */
    }

    /**
     * @dev Executed when a purchase has been validated and is ready to be executed. Doesn't necessarily emit/send
     * tokens.
     * @param beneficiary Address receiving the tokens
     * @param tokens_ Array of tokens to be delivered to beneficiary
     */
    function _processPurchase(address beneficiary, PackageToken[] memory tokens_) internal {
        _deliverTokens(beneficiary, tokens_);
    }

    /**
     * etc.)
     * @param beneficiary Address receiving the tokens
     * @param weiAmount Value in wei involved in the purchase
     */
    function _updatePurchasingState(address beneficiary, uint256 weiAmount) internal {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @param packageID - ID of the package to fetch tokens and their amounts.
     * @return tokens_ Number of tokens that can be purchased with the specified _weiAmount
     */
    function _getTokens(uint256 packageID) internal view returns (PackageToken[] memory tokens_) {
        return _packages[packageID].tokens;
    }

    /**
     * @dev Determines how ETH is stored/forwarded on purchases.
     */
    function _forwardFunds() internal {
        _wallet.transfer(msg.value);
    }

    /**
     * @dev fallback function ***DO NOT OVERRIDE***
     */
    fallback() external payable {
        revert('Call the buyTokens method');
    }
    receive() external payable {
        revert('Call the buyTokens method');
    }
}
