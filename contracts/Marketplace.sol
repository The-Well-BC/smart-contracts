pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    SafeERC20
} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Decimal} from "./Decimal.sol";
import {TheWellNFT} from "./theWellNFT.sol";
import {IMarket} from "./IMarket.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./IPayments.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import './Admin.sol';

contract TheWellMarketplace is IMarket, ReentrancyGuard{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* *******
     * Globals
     * *******
     */

    //eth bal after last eth paid as bid  
    uint balanceAfterLastEthTransfer;

    // Address of the media contract that can call this market
    address payable public TheWellNFTContract;

    //address of the well trasury contract
    address payable public _TheWellTreasury;

    // Mapping from token ID to previous owner address
    mapping (uint256 => address) private _previousOwner;

    //address denoting ETH;
    address ETH;

    // WETH contract address
    address public WETH;

    // Allowed purchase tokens
    mapping(address => bool) public _validPurchaseToken;

    // address that can call admin functions
    address private _owner;

    // Mapping from tokenID to mapping from bidder to bid
    mapping(uint256 => mapping(address => Bid)) private _tokenBidders;

    // Mapping from token to the bid shares for the token
    mapping(uint256 => BidShares) private _bidShares;

    // Mapping from token to the current ask for the token
    mapping(uint256 => Ask) private _tokenAsks;

    // mapping to track if assk for a token is set
    mapping (uint256 => bool) public  tokenAskSet;

    //mapping of token ID to bool value for tracking of secondary sales
    mapping(uint256 => bool) public secondarySale;

    mapping(uint256 => bool) priceIsSet;

    event TokenPriceSet(uint256 ID, uint256 price);
    event TokenPurchased(uint256 ID, uint256 price);
    event TokenPurchasedERC20(uint256 ID, uint256 price, address currency);


    /* *********
     * Modifiers
     * *********
     */

    constructor(address _WETH, address OWNER, address payable TheWellTreasury_) {
        WETH = _WETH;
        _owner = OWNER;
        _TheWellTreasury = TheWellTreasury_;
        ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    }

    modifier ownerOrTheWell(uint tokenId){
        require( TheWellNFTContract == msg.sender || msg.sender ==  IERC721(TheWellNFTContract).ownerOf(tokenId), 'Market: Not token owner or token contract');
        _;
    }

    /**
     * @notice require that the msg.sender is the configured media contract
     */

    modifier onlyMediaCaller() {
        require(
            TheWellNFTContract == msg.sender,
            "Market: Only media contract"
        );
        _;
    }

    function addPurchaseToken(address purchaseToken_) public {
        require(
            msg.sender == _owner,
            "Permission denied; CALLER ADDRESS NOT OWNER"
        );
        _validPurchaseToken[purchaseToken_] = true;
    }

    function removePurchaseToken(address purchaseToken_) public {
        require(
            msg.sender == _owner,
            "Permission denied; CALLER ADDRESS NOT OWNER"
        );

        _validPurchaseToken[purchaseToken_] = false;
    }

    function isValidToken(address token_) public view returns (bool) {
        return _validPurchaseToken[token_];
    }

    function configure(address payable theWellNFTContract) external override {
        require(msg.sender == _owner, "Market: Only owner");
        require(TheWellNFTContract == address(0), "Market: Already configured");
        require(
            theWellNFTContract != address(0),
            "Market: cannot set media contract as zero address"
        );

        TheWellNFTContract = theWellNFTContract;
    }

    function currentAskForToken(uint256 tokenId)
        external
        view
        override
        returns (Ask memory)
    {
        return _tokenAsks[tokenId];
    }

    function bidSharesForToken(uint256 tokenId)
        public
        view
        override
        returns (BidShares memory)
    {
        return _bidShares[tokenId];
    }

    /**
     * @notice Sets bid shares for a particular tokenId. These bid shares must
     * sum to 100
     */
    function setBidShares(uint256 tokenId, Decimal.D256 calldata _prevOwner, Decimal.D256 calldata __owner, Decimal.D256 calldata _creator)
        public
        override
        onlyMediaCaller
    {
        BidShares memory bidShares;
        bidShares.prevOwner = _prevOwner;
        bidShares.creator = _creator;
        bidShares.owner = __owner;
        require(
            isValidBidShares(bidShares),
            "Market: Invalid bid shares, must sum to 100"
        );

        _bidShares[tokenId] = bidShares;
        emit BidShareUpdated(tokenId, bidShares);
    }

    /**
     * @notice Validates that the bid is valid by ensuring that the bid amount can be split perfectly into all the bid shares.
     *  We do this by comparing the sum of the individual share values with the amount and ensuring they are equal. Because
     *  the splitShare function uses integer division, any inconsistencies with the original and split sums would be due to
     *  a bid splitting that does not perfectly divide the bid amount.
     */
    function isValidBid(uint256 tokenId, uint256 bidAmount)
        public
        view
        override
        returns (bool)
    {
        BidShares memory bidShares = bidSharesForToken(tokenId);
        require(
            isValidBidShares(bidShares),
            "Market: Invalid bid shares for token"
        );

        return
        bidAmount != 0 &&
            (bidAmount ==
             splitShare(bidShares.creator, bidAmount)
        .add(splitShare(bidShares.prevOwner, bidAmount))
        .add(splitShare(bidShares.owner, bidAmount)));
    }

    function bidForTokenBidder(uint256 tokenId, address bidder)
        external
        view
        override
        returns (Bid memory)
    {
        return _tokenBidders[tokenId][bidder];
    }

    /**
     * @notice Validates that the provided bid shares sum to 100
     */
    function isValidBidShares(BidShares memory bidShares)
        public
        pure
        override
        returns (bool)
    {
        return
        bidShares.creator.value.add(bidShares.owner.value).add(
            bidShares.prevOwner.value
        ) == uint256(100).mul(Decimal.BASE);
    }

    /**
     * @notice return a % of the specified amount. This function is used to split a bid into shares
     * for a media's shareholders.
     */
    function splitShare(Decimal.D256 memory sharePercentage, uint256 amount)
        public
        pure
        override
        returns (uint256)
    {
        return Decimal.mul(amount, sharePercentage).div(100);
    }

    /**
     * @notice removes an ask for a token and emits an AskRemoved event
     */
    function _removeAsk(uint256 tokenId) private nonReentrant {
        require(tokenAskSet[tokenId] == true, 'Market: token ask not set');
        emit AskRemoved(tokenId, _tokenAsks[tokenId]);
        // TheWellNFT(TheWellNFTContract).unsetPrice(tokenId);
        tokenAskSet[tokenId] = false;

        delete _tokenAsks[tokenId];
    }

    function removeAsk(uint256 tokenId) external override
        ownerOrTheWell(tokenId) nonReentrant
    {
        return _removeAsk(tokenId);
    }

    function removeBid(uint256 tokenId, address bidder)
        public
        override
    {
        require(bidder == msg.sender, 'bidder must be msgsender');
        Bid storage bid = _tokenBidders[tokenId][bidder];
        uint256 bidAmount = bid.amount;
        address bidCurrency = bid.currency;

        require(_validPurchaseToken[bidCurrency] == true);
        require(bid.amount > 0, "Market: cannot remove bid amount of 0");

        IERC20 token = IERC20(bidCurrency);

        emit BidRemoved(tokenId, bid);
        delete _tokenBidders[tokenId][bidder];
        token.safeTransfer(bidder, bidAmount);
    }

    /**
     * @notice Sets the ask on a particular media. If the ask cannot be evenly split into the media's
     * bid shares, this reverts.
     */
    function setAsk(
        uint256 tokenId,
        uint256 amount,
        address currency
    ) public override ownerOrTheWell(tokenId) {
        require(tokenAskSet[tokenId] != true, 'AUCTION: token ask already set, use removeAsk');
        require(
            isValidBid(tokenId, amount),
            "Market: Ask invalid for share splitting"
        );

        require(
            _validPurchaseToken[currency],
            "Market: invalid ask currency set"
        );

        Ask memory ask;
        ask.amount = amount;
        ask.currency = currency;

        tokenAskSet[tokenId] = true;
        _tokenAsks[tokenId] = ask;
        emit AskCreated(tokenId, ask);
    }

    /**
     * Getter fn for address of previous owner of token
     */

    function previousOwner(uint tokenID) public view returns (address) {
        require( _previousOwner[tokenID] != address(0), "ERC721: previous owner query gives invalid address");
        return _previousOwner[tokenID];
    }

    /**
     * Bid on token
     */
    function createBid(
        uint256 tokenId,
        Bid memory bid,
        address spender
    ) public payable override nonReentrant {
        BidShares memory bidShares = _bidShares[tokenId];
        require(
            bidShares.creator.value.add(bid.sellOnShare.value) <=
            uint256(100).mul(Decimal.BASE),
            "Market: Sell on fee invalid for share splitting"
        );
        require(bid.bidder != address(0), "Market: bidder cannot be 0 address");
        require(bid.amount != 0, "Market: cannot bid amount of 0");
        require(
            bid.currency != address(0),
            "Market: bid currency cannot be 0 address"
        );
        require(
            ERC20(bid.currency).decimals() == 18,
            "'Market: invalid bid currency, decimals not 18"
        );
        require(
            _validPurchaseToken[bid.currency],
            "Market: invalid purchase currency"
        );
        require(
            bid.recipient != address(0),
            "Market: bid recipient cannot be 0 address"
        );

        Bid storage existingBid = _tokenBidders[tokenId][bid.bidder];

        // If there is an existing bid, refund it before continuing
        if (existingBid.amount > 0) {
            removeBid(tokenId, bid.bidder);
        }

        IERC20 token = IERC20(bid.currency);

        // We must check the balance that was actually transferred to the market,
        // as some tokens impose a transfer fee and would not actually transfer the
        // full amount to the market, resulting in locked funds for refunds & bid acceptance
        if( token == IERC20(ETH)) {
            require( bid.amount == msg.value, 'bid amount not equal to ether sent'); 


            _tokenBidders[tokenId][bid.bidder] = Bid(
                bid.amount,
                bid.currency,
                bid.bidder,
                bid.recipient,
                bid.sellOnShare
            );
        } else {

            uint256 beforeTransferBalance = token.balanceOf(address(this));
            token.safeTransferFrom(spender, address(this), bid.amount);
            uint256 afterTransferBalance = token.balanceOf(address(this));
            _tokenBidders[tokenId][bid.bidder] = Bid(
                afterTransferBalance.sub(beforeTransferBalance),
                bid.currency,
                bid.bidder,
                bid.recipient,
                bid.sellOnShare
            );
        }
        emit BidCreated(tokenId, bid);

        // If a bid meets the criteria for an ask, automatically accept the bid.
        // If no ask is set or the bid does not meet the requirements, ignore.
        if (
            _tokenAsks[tokenId].currency != address(0) &&
                bid.currency == _tokenAsks[tokenId].currency &&
                    _validPurchaseToken[bid.currency] &&
                        bid.amount >= _tokenAsks[tokenId].amount
        ) {
            //remove ask
            _removeAsk(tokenId);
            // Finalize exchange
            _finalizeBidSale(tokenId, bid.bidder);
        }
    }

    /**
     * @notice Accepts a bid from a particular bidder. Can only be called by the media contract.
     * See {_finalizeBidSale}
     * Provided bid must match a bid in storage. This is to prevent a race condition
     * where a bid may change while the acceptBid call is in transit.
     * A bid cannot be accepted if it cannot be split equally into its shareholders.
     * This should only revert in rare instances (example, a low bid with a zero-decimal token),
     * but is necessary to ensure fairness to all shareholders.
     */
    function acceptBid(uint256 tokenId, Bid calldata expectedBid)
        public
        override
        nonReentrant
    {
        require( IERC721(TheWellNFTContract).ownerOf(tokenId) == msg.sender, 'Market: cannot accept bid, not token owner');
        Bid memory bid = _tokenBidders[tokenId][expectedBid.bidder];
        require(bid.amount > 0, "Market: cannot accept bid of 0");
        require(
            bid.amount == expectedBid.amount &&
            bid.currency == expectedBid.currency &&
            _validPurchaseToken[bid.currency] &&
            bid.sellOnShare.value == expectedBid.sellOnShare.value &&
            bid.recipient == expectedBid.recipient,
            "Market: Unexpected bid found."
        );
        require(
            isValidBid(tokenId, bid.amount),
            "Market: Bid invalid for share splitting"
        );

        _finalizeBidSale(tokenId, bid.bidder);
    }


    // function to set secondary sale for a tokenID mapping to true
    function setSecondarySale(uint tokenID) private {
        secondarySale[tokenID] = true;
    }

    /**
     * @notice Given a token ID and a bidder, this method transfers the value of
     * the bid to the shareholders. It also transfers the ownership of the media
     * to the bid recipient. Finally, it removes the accepted bid and the current ask.
     */
    function _finalizeBidSale(uint256 tokenId, address bidder) private {
        Bid memory bid = _tokenBidders[tokenId][bidder];
        BidShares storage bidShares = _bidShares[tokenId];

        require(_validPurchaseToken[bid.currency], "MARKET: Invalid bid currency");
        IERC20 token = IERC20(bid.currency);

        _finalizeSale(tokenId, bidder, bid, token);

        // Remove the accepted bid
        delete _tokenBidders[tokenId][bidder];

        emit BidShareUpdated(tokenId, bidShares);
        emit BidFinalized(tokenId, bid);
    }

    /**
     * @notice sends payment tokens the payment splitter contract and initializes NFT transfer
     */

    function _finalizeSale(uint256 tokenId, address buyer,  Bid memory bid, IERC20 purchaseToken) private {
        require(bid.amount >= 1000 wei);

        BidShares storage bidShares = _bidShares[tokenId];
        address recipient = buyer;

        //take %12.5 of amount as fees
        uint amountForFees = bid.amount * 125/1000;
        uint newAmount = bid.amount - amountForFees;

        address[] memory addressOfCreators =
            TheWellNFT(TheWellNFTContract).tokenCreators(tokenId);

        uint256 creatorShare = splitShare(bidShares.creator, newAmount);

        IPayments paymentContract = TheWellNFT(TheWellNFTContract).getPaymentsContract();

        if(purchaseToken != IERC20(ETH)) {
            purchaseToken.transfer(_TheWellTreasury, amountForFees);

            if(secondarySale[tokenId] == true) {
                // Transfer bid share to owner of media
                purchaseToken.safeTransfer(
                    IERC721(TheWellNFTContract).ownerOf(tokenId),
                    splitShare(bidShares.owner, newAmount)
                );

                // Transfer bid share to previous owner of media
                if (_previousOwner[tokenId] != address(0)){
                    purchaseToken.safeTransfer(
                        _previousOwner[tokenId],
                        splitShare(bidShares.prevOwner, newAmount)
                    );
                }
            } else {
                // mark first sale as done by makiing secondarySale mapping true
                setSecondarySale(tokenId);
                bool setPaymentContractAllowance;


                uint256 newAllowance = purchaseToken.allowance(address(this), address(paymentContract)) + creatorShare;
                setPaymentContractAllowance = purchaseToken.approve(address(paymentContract), newAllowance);
                require(setPaymentContractAllowance == true, 'Failed to approve allowance increase. Try again with a different ERC20');
            }

            paymentContract.receiveERC20Payment(tokenId, address(this), creatorShare, purchaseToken);

        } else{ 
            //
            //transfer fees
            TheWellTreasury.transfer(amountForFees);

            if(secondarySale[tokenId] == true) {
                // Transfer bid share to owner of media
                payable(IERC721(TheWellNFTContract).ownerOf(tokenId)).transfer(
                    splitShare(bidShares.owner, newAmount)
                );

                // Transfer bid share to previous owner of media
                if (_previousOwner[tokenId] != address(0)){
                    payable(_previousOwner[tokenId]).transfer(
                        splitShare(bidShares.prevOwner, newAmount)
                    );

                    // Transfer bid share to previous owner of media
                    if (_previousOwner[tokenId] != address(0)){
                        payable(_previousOwner[tokenId])
                        .transfer(
                            splitShare(bidShares.prevOwner, newAmount)
                        );
                    }
                } else {
                    // mark first sale as done by makiing secondarySale mapping true
                    setSecondarySale(tokenId);
                    // in case of first sale send all ether to payment splitter contract via the receive eth function 
                    paymentContract.receivePaymentETH{value: creatorShare}(tokenId);
                }

            }

            //set previous owner, turn current nft owner to previous owner then transfer out
            _previousOwner[tokenId] = IERC721(TheWellNFTContract).ownerOf(tokenId);

            // Transfer media to bid recipient
            TheWellNFT(TheWellNFTContract).nftPurchaseTransfer(
                tokenId,
                recipient
            );

            emit TokenPurchasedERC20(tokenId, bid.amount, address(purchaseToken));
        }
    }
}
