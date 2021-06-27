// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {SafeMath} from "@openzeppelin/contracts/utils/math/SafeMath.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./PaymentSplitter.sol";

import {IMarket} from "./IMarket.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TheWellNFT is ERC721URIStorage, PaymentSplitter, ReentrancyGuard  {
    struct Token{
        uint256 priceInEther;
        address owner;
        address[] collaborators;
    }

    /* auction contract address */
    address auctionContract;

    // Release Time for timelocked NFTs
    mapping(uint256 => uint256) internal ReleaseTime;

    // well admin adress
    address wellAdmin;

    /* Used to set the tokenID of newly minted tokens */
    uint256 nextTokenTracker;

    string uriTemplate;

    /* Mapping from token ID to Token */
    mapping(uint256 => Token) tokenMappings;

    mapping(uint256 => uint256) tokenPrice;

    mapping(uint256 => bool) priceIsSet;

    /**
     * @notice Sets collaboratrs, artist, and artist/collaborator cuts
     */
    constructor(
        string memory name_,
        string memory symbol_,
        string memory tokenURITemplate
    ) ERC721(name_, symbol_) {
        // setShares(_artist, _artistCut, _collaborators, _collaboratorRewards);
        setBaseURI(tokenURITemplate);
        nextTokenTracker = 1;
    }

    /** @dev checks if function caller is the artist */
    modifier isArtist(uint256 tokenId) {
        require(
            msg.sender == tokenMappings[tokenId].owner,
            "Only the lead artist can call this function"
        );
        _;
    }

    /**
     * @notice Ensure that the provided spender is the approved or the owner of
     * the media for the specified tokenId
     */
    modifier onlyApprovedOrOwner(address spender, uint256 tokenId) {
        require(
            _isApprovedOrOwner(spender, tokenId),
            "Media: Only approved or owner"
        );
        _;
    }

    /**
     * @notice Require that the token has not been burned and has been minted
     */
    modifier onlyExistingToken(uint256 tokenId) {
        require(_exists(tokenId), "Media: nonexistent token");
        _;
    }

    modifier isWellAdmin(address msgSENDER) {
        require(
            msgSENDER == wellAdmin,
            "msg.sender not the well Admin address"
        );
        _;
    }

    function changeWellAdmin(address _wellAdmin) public isWellAdmin(msg.sender) {
        wellAdmin = _wellAdmin;
    }

    function setAuctionContract(address _auctionContract) public isWellAdmin(msg.sender) {
        auctionContract = _auctionContract;
    }

    function setBaseURI(string memory uriTemplate_) internal {
        uriTemplate = uriTemplate_;
    }

    function _baseURI() internal view override returns (string memory) {
        return uriTemplate;
    }

    function setSplits(
        uint256 tokenId,
        address _artistAddr,
        uint256 _artistCut,
        address[] memory _collaborators,
        uint256[] memory _collaboratorRewards
    ) internal {
        require(
            _collaborators.length <= 10,
            "Cannot have more than 10 collaborators"
        );

        // Artist is always first collaborator
        address[] memory payees = new address[](_collaborators.length + 1);
        uint256[] memory shares = new uint256[](payees.length);

        payees[0] = _artistAddr;
        shares[0] = _artistCut;

        for (uint8 i = 1; i <= _collaborators.length; i++) {
            uint8 h = i - 1; // previous index

            payees[i] = _collaborators[h];
            shares[i] = _collaboratorRewards[h];
        }

        // Call PaymentSplitter _setShares
        _setShares(tokenId, payees, shares);
    }

    /**
      * @dev Mint function. Creates a new ERC721 token. _artist refers to the address minting the token
      * Will set the token id using nextTokenTracker and iterate nextTokenTracker.
      * Will also set the token URI

      * @param _artistCut Percentage of sales the minter gets.
      * @param _collaborators Array of other collaborators that contributed to the art.
      * @param _collaboratorRewards Array of percentage of sale that each collaborator gets.
      */

    function mint(
        uint8 _artistCut,
        address[] memory _collaborators,
        uint256[] memory _collaboratorRewards,
        string memory _tokenURI
    ) public {
        uint256 tokenId = nextTokenTracker;
        tokenMappings[tokenId] = Token(0, msg.sender, _collaborators);

        setSplits(tokenId, msg.sender, _artistCut,
            _collaborators, _collaboratorRewards);

        _safeMint(msg.sender, tokenId);

        _setTokenURI(tokenId, _tokenURI);

        nextTokenTracker++;
    }

    function lockupPeriodOver(uint256 tokenId_) external view returns(bool) {
        if( ReleaseTime[tokenId_] <= block.timestamp) {
            return true;
        } else return false;
    }

    /**
     * @dev Sale function for the NFT
     * @param tokenId_ - ID of the token being sold
     */

    //use this function to make sale in ether only
    function buyToken(uint256 tokenId_) external payable {
        require(priceIsSet[tokenId_] == true, "token price not yet set ");

        require(
            /* Checks if token price, eth value sent in this transaction is the same as the priceInEth */
            msg.value == tokenPrice[tokenId_],
            "Sent ether not equal to token price "
        );
        require(
            /* Should not fail here. Checks that total collaborators is at most ten */
            collaborators.length <= 10,
            "Error minting NFT. Too many collaborators. Please contact contract creator"
        );

        // remove ask and unset the token price 
        priceIsSet[tokenId_] = false;
        IMarket(auctionContract).removeAsk(tokenId_);

        receivePayment(tokenId_);

        // Should be transfer, not mint
    }

    event TokenPrice(uint256 ID, uint256 price);

    /* @notice Can only be called by the artist. allows the artist to change art prices */
    function setPrice(uint256 tokenID, uint256 _ArtPrice) public isArtist(tokenID) {
        /* assign price in eth to art price */
        tokenPrice[tokenID] = _ArtPrice;
        IMarket AuctionContract = IMarket(auctionContract);
        AuctionContract.setAsk(tokenID, _ArtPrice, AuctionContract.getWETH());
        priceIsSet[tokenID] = true;
        emit TokenPrice(tokenID, _ArtPrice);
    }

    /**
     * Returns addresses of creators of token.
     * @param tokenId_ ID of token
     */
    function tokenCreators(uint256 tokenId_) external view returns (address[] memory) {
        return _payees[tokenId_];
    }

    // this function aims to mimic a lock up for the token, where transferred are barred for a perod of time after minting
    function setReleaseTime(uint256 tokenID, uint256 _time) public isArtist(tokenID) nonReentrant onlyExistingToken(tokenID) {
        uint256 releaseTime = block.timestamp + _time;
        ReleaseTime[tokenID] = releaseTime;
    }

    function getTokenReleaseTime(uint256 tokenID) public view returns (uint256) {
        return ReleaseTime[tokenID];
    }

    // function removes ask and unsets price
    function removeAsk(uint256 tokenId) public isArtist(tokenId) nonReentrant onlyExistingToken(tokenId) {
        priceIsSet[tokenId] = false;
        IMarket AuctionContract = IMarket(auctionContract);
        AuctionContract.removeAsk(tokenId);
    }

    function removeBid(uint256 tokenId) public nonReentrant onlyExistingToken(tokenId) {
        address bidder = msg.sender;
        IMarket AuctionContract = IMarket(auctionContract);
        AuctionContract.removeBid(tokenId, bidder);
    }

    function acceptBid(uint256 tokenId, IMarket.Bid memory bid) public nonReentrant onlyApprovedOrOwner(msg.sender, tokenId) {
        IMarket(auctionContract).acceptBid(tokenId, bid);
    }

    function createBid(uint256 tokenId, IMarket.Bid memory bid) public nonReentrant onlyExistingToken(tokenId) {
        require(msg.sender == bid.bidder, "Market: Bidder must be msg sender");
        IMarket(auctionContract).createBid(tokenId, bid, msg.sender);
    }
}
