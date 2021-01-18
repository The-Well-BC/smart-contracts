pragma solidity 0.5.0;

import "./ERC721Full.sol";

contract WellNftArtIssuer is ERC721Full {
    string public name;
    string public symbol;
    address payable public artist;
    uint public priceInEth;
    uint public priceInWei;
  string[] public ART;
  mapping(string => bool) _ArtExists;
  mapping(string => bool) _URI_Exists;
  mapping(address => uint) balances;

  using SafeMath for uint;

  constructor(string memory _name, string memory _symbol, address payable _artist, uint _priceInETH) ERC721Full(_name, _symbol) public {
      name = _name;
      symbol = _symbol;
      artist = _artist;
      priceInEth = _priceInETH;
      priceInWei =  priceInEth.mul(10^18);
  }

  function ReceiveEthAndMint(string memory _ArtAlias, string memory _uri, uint _tokenpriceInEth ) public payable {
    require(!_ArtExists[_ArtAlias]);
    require(!_URI_Exists[_uri]);
    require(_tokenpriceInEth == priceInEth && msg.value == priceInWei, 'sent ether not equal to token price ');

    balances[address(this)] += msg.value;

    artist.transfer(priceInWei);
    
    balances[address(this)] -= priceInWei;


    uint _id = ART.push(_ArtAlias);
    _ArtExists[_ArtAlias] = true;
    _mint(msg.sender, _id);
    _URI_Exists[_uri] = true;
    _setTokenURI(_id, _uri);
  }

}