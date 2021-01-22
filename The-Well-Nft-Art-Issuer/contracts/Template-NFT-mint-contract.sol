pragma solidity 0.5.0;

import "./ERC721Full.sol";


/* smart contract that mints ntf to addresses that interact with it  */

contract WellNftArtIssuer is ERC721Full {
    /* 'name' is the name of the token the contract issues */
    string public name;

    /* 'symbol' is the token symbol */
    string public symbol;

/* 'artist' is the entity who is the creator of the art the nft represents. Artist is identified by an eth address*/
    address payable public artist;

    /* 'priceInEth' is the price of the nft token set by the artist */
    uint256 public priceInEth;

    /** 'totalNumberOfArtPresent' gets the total number of art works present in the array list represnted in this smart contract */
    uint256 public totalNumberOfArtPresent;

    /** 'ART' is an array (works like a list) which contains the names/aliases of all art represnted in this smart contract */
    string[] public ART;

    /** mappings to be upated when an art is minted, added, a URI exists and for smart contract balances  */
    mapping(string => bool) _ArtMinted;
    mapping(string => bool) _ArtAdded;
    mapping(string => bool) _URI_Exists;
    mapping(address => uint256) balances;


    /* Safemath library is used for uint to prevent integer overflow during mathematical calculations */
    using SafeMath for uint;


    /** 'contrustor contains arguments that must be provided before smart contract is deployed'*/
    constructor(
        string memory _name,
        string memory _symbol,
        address payable _artist,
        uint256 _priceInETH
    ) public ERC721Full(_name, _symbol) {
        name = _name;
        symbol = _symbol;
        artist = _artist;
        priceInEth = _priceInETH;
    }


    /** Receive eth and mint token function. function collects the art ID, which becomes the token ID, the token URI and token price in eth */

    function ReceiveEthAndMint(
        uint256 _ArtID,
        string memory _uri,
        uint256 _tokenpriceInEth
    ) public payable {
        string memory _ArtAlias;
        require(
            /** checks if art is already minted  */
            !_ArtMinted[_ArtAlias],
            "this art is already tokenized on the blockchain"
        );
        require(
            /** checks if uri is already added to a token */
            !_URI_Exists[_uri],
            "this uri already exists on the blockchain"
        );
        require(
            /** cjecks if token price, eth value sent in this transaction is the same as the priceInEth */
            _tokenpriceInEth == priceInEth && msg.value == priceInEth,
            "sent ether not equal to token price "
        );


        /** logs updated ether balance of contract */
        balances[address(this)] += msg.value;

        /** transfers the received eth to the artist  */
        artist.transfer(priceInEth);

        /** logs updated ether balance of contract */
        balances[address(this)] -= priceInEth;

        /** gets art name/art alias from the Art Id which was inputted  */
        _ArtAlias = getArtAliasByID(_ArtID);

        /** updates mapping to show that art will be minted  */
        _ArtMinted[_ArtAlias] = true;

        /** mints Nft token with the art id to the function caller */
        _mint(msg.sender, _ArtID);

        /** updates mapping to show that uri is already with a token  */
        _URI_Exists[_uri] = true;

        /** set the uri to the token via the art id */
        _setTokenURI(_ArtID, _uri);
    }


    /** add art function to allow the artist only add art names/ aliases to the ART array/list */

    function addART(string memory _ArtAlias) public {
        /** checks if the function caller is the artist  */
        require(
            msg.sender == artist,
            " only the NFT artist can add artwork names to this list"
        );

        /** checks if the art name/alias added has not been addded before */
        require(!_ArtAdded[_ArtAlias], 'this art has been added with an art name into this array list');


        /** push art name into the array, totalNumberOfArtPresent updates the number of art present by counting the number of times an alias/name  push was sucessful  */
        totalNumberOfArtPresent = ART.push(_ArtAlias);

        /** uppates the mapping to show that art name/alias was added  */
        _ArtAdded[_ArtAlias] = true;
    }



    /** function to get art name/alias by ID */
    function getArtAliasByID(uint256 __id) public view returns (string memory) {
        uint256 ID;
        string memory __ArtAlias;

        /** ID is gotten by subtracting 1 from the __id each time the fucntion is called, computer reads from 0's upwards so im only optimizng for internal calculations to be compatible with computers */
        ID = __id.sub(1);


/** art name/alias is gotten by using the ID to get the name/alias via an array call function */
        __ArtAlias = ART[ID];
        return __ArtAlias;
    }


/** change art price function, can only be called by the artist. allows the artist to change art prices */
    function ChangeArtPrice(uint _ArtPrice) public {
        /** checks if function caller is thr ==e artist  */
        require(msg.sender == artist, 'you cannot change the art price, you are not the artist');

        /**assign price in eth to art price*/
        priceInEth = _ArtPrice;
    }
}

