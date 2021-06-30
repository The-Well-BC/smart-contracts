// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
import "./ERC721URIStorage.sol";
import "./PaymentSplitter.sol";
import "./ERC721.sol";
import {IMarket} from "./IMarket.sol";
import "./openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Decimal} from "./Decimal.sol";

/* The Well NFT contract */
contract TheWellNFT is ERC721URIStorage, PaymentSplitter {
    struct Token {
        uint256 priceInEther;
        address artist;
        address[] collaborators;
    }

    /* auction contract address    */
    address public auctionContract;

    // well admin adress
    address wellAdmin;

    /* Used to set the tokenID of newly minted tokens */
    uint256 nextTokenTracker;

    /* Mapping from token ID to Token */
    mapping(uint256 => Token) tokenMappings; 

    string uriTemplate;

    mapping(uint256 => bool) priceIsSet;
    mapping (uint256 => bool) firstSale;



    mapping (uint256 => uint256 ) public totalCollaborators;
    
    
     event TokenPrice(uint256 ID, uint256 price);

    /**
     * @notice Sets collaboratrs, artist, and artist/collaborator cuts
     */

    constructor(
        string memory name_,
        string memory symbol_,
        string memory tokenURITemplate,
        address owner
    ) ERC721(name_, symbol_) {
        setBaseURI(tokenURITemplate);
        nextTokenTracker = 1;
        wellAdmin = owner; 
    }

    /** @dev checks if function caller is the artist  */
    modifier isArtist(uint256 tokenId) {
        require(
            msg.sender == tokenMappings[tokenId].artist
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
            msgSENDER == wellAdmin
        );
        _;
    }

    function changeWellAdmin(address _wellAdmin)
        public
        isWellAdmin(msg.sender)
    {
        wellAdmin = _wellAdmin;
    }

    function setAuctionContract(address _auctionContract)
        public
        isWellAdmin(msg.sender)
    {
        auctionContract = _auctionContract;
    }

    function setBaseURI(string memory uriTemplate_) internal {
        uriTemplate = uriTemplate_;
    }

    function _baseURI() internal view override returns (string memory) {
        return uriTemplate;
    }

    function setShares(
        uint256 tokenId,
        address _artistAddr,
        uint256 _artistCut,
        address[] memory _collaborators,
        uint256[] memory _collaboratorRewards
    ) internal {
        require(
            _collaborators.length <= 10 ||  _collaboratorRewards.length <= 10
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
        string memory _tokenURI,
        uint _prevOwnerPercentage,
        uint _ownerPercentage,
        uint _creatorPercentage
    ) public nonReentrant {
    
        uint256 tokenId = nextTokenTracker;
        tokenMappings[tokenId] = Token(0, msg.sender, _collaborators);
        setShares(
            tokenId,
            msg.sender,
            _artistCut,
            _collaborators,
            _collaboratorRewards
        );
        
        Decimal.D256 memory prevOwner =  Decimal.D256(_prevOwnerPercentage * 10**18);
        Decimal.D256 memory owner =  Decimal.D256(_ownerPercentage * 10**18);
        Decimal.D256 memory creator =  Decimal.D256(_creatorPercentage * 10**18);
        IMarket(auctionContract).setBidShares(tokenId, prevOwner, owner, creator);

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, _tokenURI);
        nextTokenTracker++;
    }

    /**
     * @dev Sale function for the NFT
     * @param tokenId - ID of the token being sold
     */

    //use this function to make sale in ether only, works for first sale only for secondary sale use auction contract 
    function buyToken(uint256 tokenId) external payable nonReentrant {
        require(firstSale[tokenId] != true);
        require(priceIsSet[tokenId] == true, "TOKEN: token price not set");

        require(
            /* Checks if token price, eth value sent in this transaction is the same as the priceInEth */
            msg.value ==   tokenMappings[tokenId].priceInEther,
            "TOKEN: sent ether not token price"
        );

        // remove ask and unset the token price 
        priceIsSet[tokenId] = false;
        IMarket(auctionContract).removeAsk(tokenId);
        /* Uee PaymentSplitter to handle payments */
        receivePayment(tokenId);
        
        //tranfer token to buyer, ensure this contract has been approved to transferFrom token owner 
         _transfer(ownerOf(tokenId), msg.sender, tokenId);

         //mark first sale done 
        firstSale[tokenId] = true;
        IMarket(auctionContract).setSecondarySale(tokenId);
    }

   

    /* @notice Can only be called by the artist. allows the artist to change art prices */
    function setPrice(uint256 tokenID, uint256 _ArtPrice)
        public
        isArtist(tokenID)
        onlyExistingToken(tokenID)
        nonReentrant
    {
        /* assign price in eth to art price */
        tokenMappings[tokenID].priceInEther = _ArtPrice;
        IMarket AuctionContract = IMarket(auctionContract);
        AuctionContract.setAsk(tokenID, _ArtPrice, AuctionContract.getWETH());
        priceIsSet[tokenID] = true;
        emit TokenPrice(tokenID, _ArtPrice);
    }

    /**
     * Returns addresses of creators of token.
     * @param tokenId_ ID of token
     */
    function tokenCreators(uint256 tokenId_)
        external
        view
        returns (address[] memory)
    {
        return _payees[tokenId_];
    }

    /**
     * @notice - Returns collaborator address, collaborator share, collaborator balance
     */
    function getCollaborator(uint256 tokenId_, address _address)
        external
        view
        returns (
            address,
            uint256,
            uint256
        )
    {
        return payeeDetails(tokenId_, _address);
    }

        // this function aims to mimic a lock up for the token, where transferred are barred for a perod of time after minting
    function setReleaseTime(uint256 tokenID, uint256 _time)
        public
        isArtist(tokenID)
        nonReentrant
        onlyExistingToken(tokenID)
    {
        uint256 releaseTime = block.timestamp + _time;
        ReleaseTime[tokenID] = releaseTime;
    }

    function getTokenReleaseTime(uint256 tokenID)
        public
        view
        returns (uint256)
    {
        return ReleaseTime[tokenID];
    }


}
