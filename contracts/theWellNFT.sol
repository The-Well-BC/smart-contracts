// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./IPayments.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import './Admin.sol';
import {IMarket} from "./IMarket.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Decimal} from "./Decimal.sol";

contract TheWellNFT is ERC721URIStorage, ReentrancyGuard, WellAdmin {
    struct Token{
        uint256 priceInEther;
        address owner;
        address[] collaborators;
    }

    /* auction contract address */
    address auctionContract;

    /* Payments handler contract */
    IPayments private paymentsContract;

    /* Used to set the tokenID of newly minted tokens */
    uint256 nextTokenTracker;

    /* Mapping from token ID to Token */
    mapping(uint256 => Token) tokenMappings;

    string uriTemplate;

    // Release Time for timelocked NFTs
    mapping(uint256 => uint256) internal ReleaseTime;

    event MintNFT(uint256 _tokenID, string _contentHash, address[] _creators);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory tokenURITemplate
    ) ERC721(name_, symbol_) {
        setBaseURI(tokenURITemplate);
        nextTokenTracker = 1;
    }

    /** @dev checks if function caller is the artist */
    function isArtist(uint256 tokenId, address caller_) public returns(bool) {
        return (caller_ == tokenMappings[tokenId].owner);
    }

    function checkTokenExists(uint256 tokenID) public returns(bool) {
        return _exists(tokenID);
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
        require(_exists(tokenId));
        _;
    }

    modifier onlyMarketplaceContract() {
        require(msg.sender == address(marketplaceContractAddress));
        _;
    }

    function setMarketplaceContract(IMarket _marketplaceContract) public wellAdmin() {
        marketplaceContractAddress = _marketplaceContract;
    }

    function setPaymentContract(IPayments _paymentContract) public wellAdmin() {
        paymentsContract = _paymentContract;
    }
    function getPaymentsContract() public view returns(IPayments paymentContract) {
        return paymentsContract;
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
    ) internal returns(address[] memory) {
        require(
            _collaborators.length <= 10,
            "Too many collaborators"
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

        // Call PaymentSplitter setShares
        IPayments(paymentsContract).setShares(tokenId, payees, shares);

        return payees;
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
        string memory _tokenURI,
        uint _prevOwnerPercentage,
        uint _ownerPercentage,
        uint _creatorPercentage
    ) public nonReentrant {

        uint256 tokenId = nextTokenTracker;
        tokenMappings[tokenId] = Token(0, msg.sender, _collaborators);
        address[] memory creators_ = setSplits(
            tokenId,
            msg.sender,
            _artistCut,
            _collaborators,
            _collaboratorRewards
        );

        Decimal.D256 memory prevOwner =  Decimal.D256(_prevOwnerPercentage * 10**18);
        Decimal.D256 memory owner =  Decimal.D256(_ownerPercentage * 10**18);
        Decimal.D256 memory creator =  Decimal.D256(_creatorPercentage * 10**18);

        IMarket(marketplaceContractAddress).setBidShares(tokenId, prevOwner, owner, creator);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        nextTokenTracker++;

        emit MintNFT(tokenId, _tokenURI, creators_);
    }

    function nftPurchaseTransfer(uint256 tokenId_, address recipient_) external onlyMarketplaceContract {
        // Transfer media to bid recipient
        _safeTransfer(
            ownerOf(tokenId_),
            recipient_,
            tokenId_,
            "NFT purchase transfer"
        );
    }

    function lockupPeriodOver(uint256 tokenId_) external view returns(bool) {
        if( ReleaseTime[tokenId_] <= block.timestamp) {
            return true;
        } else return false;
    }

    /**
     * Returns addresses of creators of token.
     * @param tokenId_ ID of token
     */
    function tokenCreators(uint256 tokenId_) external view returns (address[] memory) {
        return IPayments(paymentsContract).payees(tokenId_);
    }

    // this function aims to mimic a lock up for the token, where transferred are barred for a perod of time after minting
    function setReleaseTime(uint256 tokenID, uint256 _time)
        public nonReentrant onlyExistingToken(tokenID)
    {
        require(isArtist(tokenID, msg.sender));
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
