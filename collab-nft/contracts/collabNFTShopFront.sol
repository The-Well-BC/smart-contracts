// SPDX-License-Identifier: UNLICENSED

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "./PaymentSplitter.sol";


/* smart contract that mints ntf to addresses that interact with it  */
contract NFTShopFront is ERC1155, PaymentSplitter {
    struct Token{
        uint256 supply;
        uint256 priceInEther;
    }

    /* Mapping from token ID to Token */
    mapping(uint256 => Token) tokenMappings;

    mapping(uint256 => uint256) tokenPrice;

    /* 'priceInEth' is the price of the nft token set by the artist */
    uint256 public priceInEth;

    /* 'totalNumberOfFilesuploaded' gets the total number of art files/media uploaded to ipfs*/
    uint256 totalNumberOfFilesUploaded;

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
    /* artArray contains all the art in the NFT. An alias will be used to identify the Art */
    /* To save memory, we'll use an array for previewArt */
    Art[] private artArray;
    Art[] public previewArray;

    /* 'totalArt' gets the total number of media present in the token */
    uint256 public totalArt;

    uint256 public totalArtAdded;

    /**
     * @notice Sets collaboratrs, artist, and artist/collaborator cuts
     */

    constructor(
        address _artist,
        uint8 _artistCut,
        address[] memory _collaborators,
        uint256[] memory _collaboratorRewards,

        string memory tokenURITemplate

        // bytes32[] memory ipfsHashes
    ) ERC1155(tokenURITemplate) {
        setShares(_artist, _artistCut, _collaborators, _collaboratorRewards);
        // _setURI(tokenURITemplate);
    }

    /** @dev checks if function caller is the artist  */
    modifier isArtist() {
        require(
            msg.sender == artist._address,
            "You cannot change the art price, you are not the artist"
        );
        _;

    }

    function setShares(
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
        artist = Collaborator(payable(_artistAddr), uint8(_artistCut), 0);

        // Call PaymentSplitter _setShares
        _setShares(payees, shares);
    }

    /**
     * @dev Sale function for the shopfront
     * @param _tokenID - ID of the token being sold
     */
    function receiveEthAndMint(
        uint256 _tokenID,
        uint256 amount
    ) external payable {
        require(
            amount > 0,
            'You cannot mint 0 tokens'
        );
        require(
            msg.value > 0,
            'Payment must be more than zero!'
        );

        require(
            /* Checks if token price, eth value sent in this transaction is the same as the priceInEth */
            msg.value == priceInEth,
            "sent ether not equal to token price "
        );
        require(
            /* Should not fail here. Checks that total collaborators is at most ten */
            collaborators.length <= 10,
            'Error minting NFT. Too many collaborators. Please contact contract creator'
        );

        /* Uee PaymentSplitter to handle payments */
        receivePayment();

        _mint(msg.sender, _tokenID, amount, '');
    }

    /**
     * @notice addMedia nunction to allow the artist only add art names/ aliases to the artArray array/list
     */
    function addMedia(string memory tokenID, string memory _ipfsHash) public  isArtist{
        /* push art name into the array, totalArt updates the number of art present by counting the number of times an alias/name  push was sucessful  */
        artArray.push(Art(1, _ipfsHash, ''));
        totalArt++;
    }

    /* change art price function, can only be called by the artist. allows the artist to change art prices */
    function setPrice(uint256 _ArtPrice, uint256 tokenID) public isArtist {
        /*assign price in eth to art price*/
        tokenPrice[tokenID] = _ArtPrice;
    }

    function getCollaborators() external view returns(address[] memory) {
        return _payees;
    }

    /**
      * @notice - Returns collaborator address, collaborator share, collaborator balance
      */
    function getCollaborator(address _address) external view returns(address, uint256, uint256) {
        return payeeDetails(_address);
    }
}
