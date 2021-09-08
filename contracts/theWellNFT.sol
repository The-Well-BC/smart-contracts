// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import './Admin.sol';
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract TheWellNFT is ERC721URIStorage, ReentrancyGuard, WellAdmin {
    struct Token{
        address owner; // the address that mints the NFT. Makes important decisions concerning the NFT
        address[] creators; // address of all creators/collaborators, including the address in owner
        mapping(address => uint256) creatorShares;
    }

    /* The Well Marketplace contract address */
    address wellMarketplace;

    /* Other approved marketplace contracts */
    mapping(address => bool) allowedMarketplaceContracts;

    /* Payments handler contract */
    address private paymentsContract;

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

    /** @dev checks if  caller is the artist/minter */
    function isArtist(uint256 tokenId, address caller_) public returns(bool) {
        return (caller_ == tokenMappings[tokenId].owner);
    }

    function checkTokenExists(uint256 tokenID) public view returns(bool) {
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

    /**
      *
      */
    function onlyMarketplaceContract(address addr) internal returns (bool) {
        return (addr == address(wellMarketplace) || allowedMarketplaceContracts[addr] == true);
    }

    function setMarketplaceContract(address _marketplaceContract) public wellAdmin() {
        wellMarketplace = _marketplaceContract;
    }

    function addApprovedMarketplace(address _otherMarketplace) public wellAdmin() {
        allowedMarketplaceContracts[_otherMarketplace] = true;
    }

    function setPaymentContract(address _paymentContract) public wellAdmin() {
        paymentsContract = _paymentContract;
    }
    function getPaymentsContract() public view returns(address paymentContract) {
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
        tokenMappings[tokenId].creatorShares[_artistAddr] = _artistCut;

        for (uint8 i = 0; i < _collaborators.length; i++) {
            tokenMappings[tokenId].creatorShares[_collaborators[i]] = _collaboratorRewards[i];
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
    ) public nonReentrant {
        uint256 tokenId = nextTokenTracker;

        Token storage token_;
        token_.creators = _collaborators;
        token_.creators.push(msg.sender);
        token_.owner = msg.sender;
        //now set the new token_ object into the mapping
        tokenMappings[tokenId] = token_;

        address[] memory creators_ = tokenMappings[tokenId].creators;

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
            require(onlyMarketplaceContract(to) == true);

        super._approve(to, tokenId);
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
        return tokenMappings[tokenId_].creators;
    }

    /**
     * Returns creator share
     * @param tokenId_ ID of token
     * @param creator_ address of creator
     */
    function creatorShare(uint256 tokenId_, address creator_) external view returns (uint256) {
        return tokenMappings[tokenId_].creatorShares[creator_];
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
}
