pragma solidity 0.5.0;
import "./ERC721Full.sol";


/* smart contract that mints ntf to addresses that interact with it  */
contract CollabNFT is ERC721Full {
    string public name;
    string public symbol;

    /* 'priceInEth' is the price of the nft token set by the artist */
    uint256 public priceInEth;

    /** 'totalNumberOfFilesuploaded' gets the total number of art files/media uploaded to ipfs*/
    uint256 totalNumberOfFilesUploaded;

    struct Collaborator {
        address payable _address;
        uint8 rewardPercentage;
        uint256 balance;
    }

    /* 'artist' is the entity who is the MAIN creator of the art the nft represents. Artist is identified by an eth address*/
    Collaborator artist;

    Collaborator[] public collaborators;
    uint256 public totalCollaborators;

    /** Set to false if the media is not to be shown on the NFT page, or in searh results */
    struct Art {
        uint8 id;
        string ipfsHash;
        string _alias;
    }
    /** artArray contains all the art in the NFT. An alias will be used to identify the Art */
    /** To save memory, we'll use an array for previewArt */
    Art[] private artArray;
    Art[] public previewArray;

    /** 'totalArt' gets the total number of media present in the token */
    uint256 public totalArt;

    uint256 public totalArtAdded;

    /** mappings to be upated when an art is minted, added, a URI exists and for smart contract balances  */
    mapping(string => bool) _ArtMinted;
    mapping(string => bool) _ArtAdded;
    mapping(string => bool) ipfsAdded;
    mapping(string => bool) _URI_Exists;
    mapping(address => uint256) balances;
    mapping(address => bool) collaboratorAdded;

    using SafeMath for uint;

    constructor(
        string memory _name,
        string memory _symbol,

        address payable _artist,
        uint8 _artistCut,
        address payable[] memory _collaborators,
        uint8[] memory _collaboratorRewards,

        bytes32[] memory ipfsHashes
    ) public ERC721Full(_name, _symbol) {
        name = _name;
        symbol = _symbol;
        artist = Collaborator(_artist, _artistCut, 0);

        setCollaborators(_collaborators, _collaboratorRewards);
    }

    /** Function collects the art ID, which becomes the token ID, the token URI and token price in eth */
    function receiveEthAndMint(
        uint256 _tokenpriceInEth
    ) public payable {
        string memory _ArtAlias;
        require(
            /** checks if art is already minted  */
            !_ArtMinted[_ArtAlias],
            "this art is already tokenized on the blockchain"
        );

        require(
            /** Checks if token price, eth value sent in this transaction is the same as the priceInEth */
            _tokenpriceInEth == priceInEth && msg.value == priceInEth,
            "sent ether not equal to token price "
        );
        require(
            /** Should not fail here, but checks that total collaborators is at most ten */
            collaborators.length <= 10,
            'Error minting NFT. Too many collaborators. Please contact contract creator'
        );

        /** logs updated ether balance of contract */
        balances[address(this)] += msg.value;

        for (uint256 i = 0; i < totalCollaborators; i++) {
            if (totalCollaborators == 0) {
                break;
            } else { 
                Collaborator memory _collaborator;
                uint256 collaboratorReward;
                uint256 finalEth;
                uint256 ethforCollaboratorBeforeCalculatingForPercentage;

                _collaborator = collaborators[i];

                _collaborator.balance = priceInEth.div(100).mul(uint256(_collaborator.rewardPercentage));
            }
        } 
    }

    /**
      addMedia function to allow the artist only add art names/ aliases to the artArray array/list
    */
    function addMedia(string memory _ArtAlias, string memory ipfshashnumber) public {
        require(
            msg.sender == artist._address,
            "Only the NFT artist can add artwork names to this list"
        );

        /** Check that art is not being duplicated */
        require(
            !_ArtAdded[_ArtAlias] ,
            "Media with this name already exists on this NFT."
        );
        require(!ipfsAdded[ipfshashnumber], "Media with this IPFS hash already exists on this NFT contract");

        /** push art name into the array, totalArt updates the number of art present by counting the number of times an alias/name  push was sucessful  */
        totalArt = artArray.push(Art(1, ipfshashnumber, _ArtAlias));

        /** uppates the mapping to show that art name/alias was added  */
        _ArtAdded[_ArtAlias] = true;

         /** uppates the mapping to show ipfs hash was added  */
        ipfsAdded[ipfshashnumber] = true;
    }

    function setCollaborators(
        address payable[] memory _collaborators,
        uint8[] memory _rewardPercentage
    ) public returns(uint) {
        /** checks if the function caller is the artist  */
        require(
            msg.sender == artist._address,
            "only the NFT artist can set collaborators"
        );
        require(
            _collaborators.length <= 10,
            'NFT can only have up to 10 collaborators'
        );
        require(
            _rewardPercentage.length == _collaborators.length,
            'Length of collaborators array should equal length of percentage rewards'
        );

        /** Resetting collaborators array */
        delete collaborators;

        for (uint8 i = 0; i < _collaborators.length; i++) {
            /** collaborators[i] = Collaborator(_collaborators[i], _rewardPercentage[i], 0); */
            collaborators.push(
                Collaborator(_collaborators[i], _rewardPercentage[i], 0)
            );
        }

        /** totalCollaborators = _collaborators.length; */
        return collaborators.length;
    }

    /** Returns collaborator addresses in one array, and reward percentages in another, in order */
    function getCollaborators() public view returns(address[10] memory, uint8[10] memory) {
        address[10] memory addrs;
        uint8[10] memory rewardPercentages;

        if(collaborators.length < 0) {
            return (addrs, rewardPercentages);
        } else {
            for(uint8 i = 0; i < collaborators.length; i++) {
                require(
                    i < collaborators.length,
                    "Here's the error"
                );
                addrs[i] = collaborators[i]._address;
                rewardPercentages[i] = collaborators[i].rewardPercentage;
            }

            return (addrs, rewardPercentages);
        }
    }

    /** function to get collaborator by number i.e collaborator 1 will have an id of 1 */
    function getCollaboratorByID(uint256 __id) public view returns (address) {
        uint256 collaboratorID;
        address collaboratorAddress;

        collaboratorID = __id.sub(1);

        /** art name/alias is gotten by using the ID to get the name/alias via an array call function */
        collaboratorAddress = collaborators[collaboratorID]._address;
        return collaboratorAddress;
    }

    /** change art price function, can only be called by the artist. allows the artist to change art prices */
    function setPrice(uint256 _ArtPrice) public {
        /** checks if function caller is thr ==e artist  */
        require(
            msg.sender == artist._address,
            "you cannot change the art price, you are not the artist"
        );

        /**assign price in eth to art price*/
        priceInEth = _ArtPrice;
    }
}
