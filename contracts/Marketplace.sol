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

contract TheWellMarketplace is IMarket, ReentrancyGuard{
    using SafeMath for uint256;
    using SafeERC20 for IERC20;

    /* *******
     * Globals
     * *******
     */
    // Address of the media contract that can call this market
    address payable public TheWellNFTContract;

    // Mapping from token ID to previous owner address
    mapping (uint256 => address) private _previousOwner;

    // WETH contract address
    address public WETH;

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

    struct TokenPrice {
        uint256 amount;
        string currency;
    }

    mapping(uint256 => bool) priceIsSet;

    mapping(uint256 => TokenPrice) tokenPriceMappings;

    event TokenPriceSet(uint256 ID, uint256 price);
    event TokenPurchased(uint256 ID, uint256 price);
    event TokenPurchasedERC20(uint256 ID, uint256 price, address currency);


    /* *********
     * Modifiers
     * *********
     */

     modifier ownerOrTheWell(uint tokenId){
         require( TheWellNFTContract == msg.sender || msg.sender ==  IERC721(TheWellNFTContract).ownerOf(tokenId), 'AUCTION: Not token owner or token contract');
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

    constructor(address _WETH, address OWNER) {
        WETH = _WETH;
        _owner = OWNER;
    }

    function changeWETHaddress(address _WETH) public {
        require(
            msg.sender == _owner,
            "Permission denied; CALLER ADDRESS NOT OWNER"
        );
        WETH = _WETH;
    }

    function getWETH() public view override returns (address) {
        return WETH;
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
    function removeAsk(uint256 tokenId) public override
        ownerOrTheWell(tokenId) nonReentrant
    {
        require(tokenAskSet[tokenId] == true, 'AUCTION: token ask not set');
        emit AskRemoved(tokenId, _tokenAsks[tokenId]);
        // TheWellNFT(TheWellNFTContract).unsetPrice(tokenId);
        tokenAskSet[tokenId] = false;

        delete _tokenAsks[tokenId];
    }

    function removeBid(uint256 tokenId, address bidder)
        public
        override
    {
        require(bidder == msg.sender, 'bidder must be msgsender');
        Bid storage bid = _tokenBidders[tokenId][bidder];
        uint256 bidAmount = bid.amount;
        address bidCurrency = bid.currency;

        require(bidCurrency == WETH);
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
            currency == WETH,
            "Market: invalid ask currency set, only use WETH"
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
        Bid calldata bid,
        address spender
    ) public override {
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
            bid.currency == WETH,
            "'Market: invalid bid currency set, only use WETH address'"
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
        emit BidCreated(tokenId, bid);

        // If a bid meets the criteria for an ask, automatically accept the bid.
        // If no ask is set or the bid does not meet the requirements, ignore.
        if (
            _tokenAsks[tokenId].currency != address(0) &&
            bid.currency == _tokenAsks[tokenId].currency &&
            bid.currency == WETH &&
            bid.amount >= _tokenAsks[tokenId].amount
        ) {
            //remove ask
            removeAsk(tokenId);
            // Finalize exchange
            _finalizeBidSale(tokenId, bid.bidder);
        }
    }

    /* @notice Can only be called by the artist. allows the artist to change art prices */
    function setPrice(uint256 tokenID, uint256 _ArtPrice) public nonReentrant {
        TheWellNFT NFTContract = TheWellNFT(TheWellNFTContract);

        require(NFTContract.isArtist(tokenID, msg.sender), 'Caller is not artist');
        require(NFTContract.checkTokenExists(tokenID));

        /* assign price in eth to art price */
        tokenPriceMappings[tokenID] = TokenPrice(_ArtPrice, 'eth');

        priceIsSet[tokenID] = true;
        emit TokenPriceSet(tokenID, _ArtPrice);
    }

    /**
     * Purchase a token
     * Function will accept ether and an erc20 token
     */
    function buyToken(uint256 tokenId_, uint256 amount, IERC20 purchaseToken) external {
        require(secondarySale[tokenId_] != true);
        require(priceIsSet[tokenId_] == true, "Set token price first");

        require(
            /* Checks if amount sent is the equal to token priceInEth */
            amount == tokenPriceMappings[tokenId_].amount,
            "NFT: Sent ether must equal NFT price"
        );

        // Hold the funds for the duration of transaction
        purchaseToken.safeTransferFrom(
            msg.sender,
            address(this),
            amount
        );

        return _finalizeSale(tokenId_, msg.sender, amount, purchaseToken);
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
        require( IERC721(TheWellNFTContract).ownerOf(tokenId) == msg.sender, 'AUCTION: cannot accept bid, not token owner');
        Bid memory bid = _tokenBidders[tokenId][expectedBid.bidder];
        require(bid.amount > 0, "Market: cannot accept bid of 0");
        require(
            bid.amount == expectedBid.amount &&
                bid.currency == expectedBid.currency &&
                bid.currency == WETH &&
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

        require(bid.currency == WETH, "MARKET: Invalid bid currency");
        IERC20 token = IERC20(bid.currency);

        _finalizeSale(tokenId, bidder, bid.amount, token);

        // Remove the accepted bid
        delete _tokenBidders[tokenId][bidder];

        emit BidShareUpdated(tokenId, bidShares);
        emit BidFinalized(tokenId, bid);
    }

    /**
     * @notice sends payment tokens the payment splitter contract and initializes NFT transfer
     */

    function _finalizeSale(uint256 tokenId, address buyer, uint256 amount, IERC20 purchaseToken) private {
        BidShares storage bidShares = _bidShares[tokenId];
        address recipient = buyer;

        address[] memory addressOfCreators =
            TheWellNFT(TheWellNFTContract).tokenCreators(tokenId);

        uint256 creatorShare = splitShare(bidShares.creator, amount);

        IPayments paymentContract = TheWellNFT(TheWellNFTContract).getPaymentsContract();
        if(secondarySale[tokenId] == true) {
            // Transfer bid share to owner of media
            purchaseToken.safeTransfer(
                IERC721(TheWellNFTContract).ownerOf(tokenId),
                splitShare(bidShares.owner, amount)
            );

            // Transfer bid share to previous owner of media
            if (_previousOwner[tokenId] != address(0)){
                purchaseToken.safeTransfer(
                    _previousOwner[tokenId],
                    splitShare(bidShares.prevOwner, amount)
                );
            }
        } else {
            // mark first sale as done by makiing secondarySale mapping true
            setSecondarySale(tokenId);
        }

        // Transfer tokens to payment contract
        purchaseToken.safeIncreaseAllowance(
            address(paymentContract),
            creatorShare
        );

        paymentContract.receiveERC20Payment(tokenId, address(this), creatorShare, purchaseToken);

        //set previous owner, turn current nft owner to previous owner then transfer out
        _previousOwner[tokenId] = IERC721(TheWellNFTContract).ownerOf(tokenId);

        // Transfer media to bid recipient
        TheWellNFT(TheWellNFTContract).nftPurchaseTransfer(
            tokenId,
            recipient
        );

        emit TokenPurchasedERC20(tokenId, amount, address(purchaseToken));
    }
}