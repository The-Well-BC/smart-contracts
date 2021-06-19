// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
// import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "./PaymentSplitter.sol";


/* The Well NFT contract */
contract TheWellNFT is ERC721URIStorage, PaymentSplitter {
// contract TheWellNFT is ERC721URIStorage, ERC721Enumerable, PaymentSplitter {
    struct Token{
        uint256 priceInEther;
        address owner;
        address[] collaborators;
    }

    /* Used to set the tokenID of newly minted tokens */
    uint256 nextTokenTracker;
    /* Mapping from token ID to Token */
    mapping(uint256 => Token) tokenMappings;

    string uriTemplate;

    mapping(uint256 => uint256) tokenPrice;

    struct Collaborator {
        address payable _address;
        uint8 rewardPercentage;
        uint256 balance;
    }

    /* 'artist' is the entity who is the MAIN creator of the art the nft represents. Artist is identified by an eth address*/
    Collaborator artist;

    address[] private collaborators;
    uint256 public totalCollaborators;

    /* Set to false if the media is not to be shown on the NFT page, or in searh results */
    struct Art {
        uint8 id;
        string ipfsHash;
        string _alias;
    }

    /**
     * @notice Sets collaboratrs, artist, and artist/collaborator cuts
     */

    constructor(
        string memory name_, string memory symbol_,
        string memory tokenURITemplate
    ) ERC721(name_, symbol_) {
        // setShares(_artist, _artistCut, _collaborators, _collaboratorRewards);
        setBaseURI(tokenURITemplate);
        nextTokenTracker = 1;
    }

    /** @dev checks if function caller is the artist  */
    modifier isArtist(uint256 tokenId) {
        require(
            msg.sender == tokenMappings[tokenId].owner,
            "Only the owner can change the price of this NFT"
        );
        _;
    }

    function setBaseURI(string memory uriTemplate_) internal {
        uriTemplate = uriTemplate_;
    }

    function _baseURI() internal view override returns (string memory) {
        return uriTemplate;
    }

    function setShares(
        uint256 tokenId,
        address _artistAddr, uint256 _artistCut,
        address[] memory _collaborators, uint256[] memory _collaboratorRewards
    ) internal {
        require(
            _collaborators.length <= 10,
            'Cannot have more than 10 collaborators'
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
        setShares(tokenId, msg.sender, _artistCut, _collaborators, _collaboratorRewards);

        _safeMint(msg.sender, tokenId);

        _setTokenURI(tokenId, _tokenURI);

        nextTokenTracker++;
    }

    /**
     * @dev Sale function for the NFT
     * @param tokenId_ - ID of the token being sold
     */
    function buyToken(
        uint256 tokenId_
    ) external payable {
        require(
            msg.value > 0,
            'Payment must be more than zero!'
        );

        require(
            /* Checks if token price, eth value sent in this transaction is the same as the priceInEth */
            msg.value == tokenPrice[tokenId_],
            "sent ether not equal to token price "
        );
        require(
            /* Should not fail here. Checks that total collaborators is at most ten */
            collaborators.length <= 10,
            'Error minting NFT. Too many collaborators. Please contact contract creator'
        );

        /* Uee PaymentSplitter to handle payments */
        receivePayment(tokenId_);

        // _safeMint(msg.sender, tokenId_, '');
        // Should be transfer, not mint
    }

    event TokenPrice(uint256 ID, uint256 price);

    /* @notice Can only be called by the artist. allows the artist to change art prices */
    function setPrice(uint256 tokenID, uint256 _ArtPrice) public isArtist(tokenID) {
        /* assign price in eth to art price */
        tokenPrice[tokenID] = _ArtPrice;

        emit TokenPrice(tokenID, _ArtPrice);
    }

    /**
     * Returns addresses of creators of token. 
     * @param tokenId_ ID of token
     */
    function tokenCreators(uint256 tokenId_) external view returns(address[] memory) {
        return _payees[tokenId_];
    }

    /**
      * @notice - Returns collaborator address, collaborator share, collaborator balance
      */
    function getCollaborator(uint256 tokenId_, address _address) external view returns(address, uint256, uint256) {
        return payeeDetails(tokenId_, _address);
    }
}

