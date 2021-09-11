// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import './Admin.sol';
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TheWellNFT is ERC721URIStorage, ReentrancyGuard, WellAdmin {
    string internal uriTemplate;

    /* The Well Marketplace contract address */
    address internal wellMarketplace;

    /* Other approved marketplace contracts */
    address[] public approvedMarketplaceArray;
    mapping(address => uint) internal approvedMarketplaces;

    /* Payments handler contract */
    address internal paymentsContract;

    /* Used to set the tokenID of newly minted tokens */
    uint256 internal nextTokenTracker;

    struct Token{
        address minter; // the address that mints the NFT. Makes important decisions concerning the NFT
        address[] creators; // address of all creators/collaborators. Includes the address in 'minter'
        mapping(address => uint256) creatorShares; // mapping of token creators to their share percentages
        uint48 releaseTime; // optional. Minter can set the time period a buyer has to hold this NFT for.
    }

    /* Mapping from token ID to Token */
    mapping(uint256 => Token) internal tokens;

    event MintNFT(uint256 _tokenID, string _contentHash, address[] _creators);

    constructor(
        string memory name_,
        string memory symbol_,
        string memory tokenURITemplate
    ) ERC721(name_, symbol_) {
        setBaseURI(tokenURITemplate);
        nextTokenTracker = 1;
    }

    /** @dev Checks if caller is the artist/minter */
    function isMinter(uint256 tokenId, address caller_) public view returns(bool) {
        return (caller_ == tokens[tokenId].minter);
    }

    function checkTokenExists(uint256 tokenID) external view returns(bool) {
        return _exists(tokenID);
    }

    /**
      * @notice Sets the default WellNFT marketplace.
      */
    function setMarketplaceContract(address _marketplaceContract) external isAdmin() {
        wellMarketplace = _marketplaceContract;
    }

    /**
      * @notice adds marketplace contracts that are allowed to trade Well NFTs
      */
    function addApprovedMarketplace(address _otherMarketplace) external isAdmin() {
        approvedMarketplaces[_otherMarketplace] = approvedMarketplaceArray.length + 1;
        approvedMarketplaceArray.push(_otherMarketplace);
    }

    /**
      * @notice adds marketplace contracts that are allowed to trade Well NFTs
      */
    function removeApprovedMarketplace(address _otherMarketplace) external isAdmin() {
        delete approvedMarketplaces[_otherMarketplace];
        uint index_ = approvedMarketplaces[_otherMarketplace] - 1;
        delete approvedMarketplaceArray[index_];
    }

    function getApprovedMarketplaces() external view returns(address[] memory) {
        return approvedMarketplaceArray;
    }

    function setPaymentContract(address _paymentContract) external isAdmin() {
        paymentsContract = _paymentContract;
    }
    function getPaymentsContract() external view returns(address paymentContract) {
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
    ) internal {
        require(
            _collaborators.length <= 10,
            "Too many collaborators"
        );

        // set minter rewards
        tokens[tokenId].creatorShares[_artistAddr] = _artistCut;

        for (uint8 i = 0; i < _collaborators.length; i++) {
            tokens[tokenId].creatorShares[_collaborators[i]] = _collaboratorRewards[i];
        }
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
    ) external nonReentrant {
        require(nextTokenTracker <= 4294967295);
        uint256 tokenId = nextTokenTracker;

        Token storage token_ = tokens[tokenId];
        token_.creators = _collaborators;
        token_.creators.push(msg.sender);
        token_.minter = msg.sender;

        address[] memory creators_ = tokens[tokenId].creators;

        setSplits(
            tokenId,
            msg.sender,
            _artistCut,
            _collaborators,
            _collaboratorRewards
        );

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        nextTokenTracker++;

        emit MintNFT(tokenId, _tokenURI, creators_);
    }

    /**
      * @dev Block "approve" method where "to" is not in the list of allowed marketplace contracts
      */
    function _approve(address to, uint256 tokenId) internal override {
        if( to != address(0))
            require(to == address(wellMarketplace) || approvedMarketplaces[to] >= 1);

        super._approve(to, tokenId);
    }

    function lockupPeriodOver(uint256 tokenId_) external view returns(bool) {
        return tokens[tokenId_].releaseTime <= block.timestamp;
    }

    /**
     * Returns addresses of creators of token.
     * @param tokenId_ ID of token
     */
    function tokenCreators(uint256 tokenId_) external view returns (address[] memory) {
        return tokens[tokenId_].creators;
    }

    /**
     * Returns creator share
     * @param tokenId_ ID of token
     * @param creator_ address of creator
     */
    function creatorShare(uint256 tokenId_, address creator_) external view returns (uint256) {
        return tokens[tokenId_].creatorShares[creator_];
    }

    // this function aims to mimic a lock up for the token, where transfers are barred for a period of time after minting
    function setReleaseTime(uint256 tokenID, uint256 _time)
        external nonReentrant
    {
        require(_exists(tokenID));
        require(isMinter(tokenID, msg.sender));

        uint256 releaseTime = block.timestamp + _time;
        tokens[tokenID].releaseTime = uint48(releaseTime);
    }

    function getTokenReleaseTime(uint256 tokenID) external view returns (uint256) {
        return tokens[tokenID].releaseTime;
    }
}
