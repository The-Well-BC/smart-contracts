pragma solidity 0.5.0;

import "./ERC721Full.sol";

contract WellNftArtIssuer is ERC721Full {
    string public name;
    string public symbol;
    address payable public artist;
    uint256 public priceInEth;
    uint256 public priceInWei;
    uint256 public totalNumberOfArtPresent;
    string[] public ART;
    mapping(string => bool) _ArtExists;
    mapping(string => bool) _URI_Exists;
    mapping(address => uint256) balances;

    using SafeMath for uint256;

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
        priceInWei = priceInEth.mul(10**18);
    }

    function ReceiveEthAndMint(
        uint256 _ArtID,
        string memory _uri,
        uint256 _tokenpriceInEth
    ) public payable {
        string memory _ArtAlias;
        require(
            !_ArtExists[_ArtAlias],
            "this art is already tokenized on the blockchain"
        );
        require(
            !_URI_Exists[_uri],
            "this uri already exists on the blockchain"
        );
        require(
            _tokenpriceInEth == priceInEth && msg.value == priceInWei,
            "sent ether not equal to token price "
        );

        balances[address(this)] += msg.value;
        artist.transfer(priceInWei);
        balances[address(this)] -= priceInWei;

        _ArtAlias = getArtAliasByID(_ArtID);
        _ArtExists[_ArtAlias] = true;

        _mint(msg.sender, _ArtID);

        _URI_Exists[_uri] = true;
        _setTokenURI(_ArtID, _uri);
    }

    function addART(string memory _ArtAlias) public returns (string memory) {
        require(
            msg.sender == artist,
            " only the NFT artist can add artwork names to this list"
        );
        totalNumberOfArtPresent = ART.push(_ArtAlias);
        string memory Success;
        Success = "ART ADDED";
        return Success;
    }

    function getArtAliasByID(uint256 __id) public view returns (string memory) {
        uint256 ID;
        string memory __ArtAlias;
        ID = __id.sub(1);

        __ArtAlias = ART[ID];
        return __ArtAlias;
    }
}
