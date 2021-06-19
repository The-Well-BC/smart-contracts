pragma solidity >=0.8.4;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@ensdomains/ens-contracts/contracts/registry/ENS.sol';

contract SubDomainRegistrar {
    bytes32 constant TLD_LABEL = keccak256("eth");

    // namehash('eth')
    bytes32 constant public TLD_NODE = 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;
    bytes32 rootLabelHash;
    bytes32 domainNode;

    ENS ens;

    IERC20 redeemToken;

    // name to subdomain mapping
    mapping(string => address) subdomains;

    /**
     * Constructor.
     * @param ensAddr The address of the ENS registry.
     * @param domainNode_ Namehash of the domain that this registrar administers subdomains for.
     */
    constructor(ENS ensAddr, bytes32 domainNode_, IERC20 redeemToken_) {
        ens = ensAddr;
        domainNode = domainNode_;
        redeemToken = redeemToken_;
    }

    function namehash(bytes32 label_) public view returns (bytes32) {
        return keccak256(abi.encodePacked(domainNode, label_));
    }

    function namehashEth(string memory label_) public view returns (bytes32) {
        return keccak256(abi.encodePacked(TLD_NODE, label_));
    }

    event SubdomainRegistration(bytes32 domainNode_, bytes32 subdomainLabel, address payable owner);
    event LabelHash(string _type, bytes32 keccak);
    /**
     * @dev registers subdomains in exchange for x amount of tokens redeemToken
     */
    function register(string calldata subdomain_,  address payable owner_) external {
        require(owner_ == msg.sender, 'Sender must be owner of sudcomain');

        bytes32 subdomainLabel =  keccak256(bytes(subdomain_));

        emit LabelHash('eth', keccak256('eth'));
        emit SubdomainRegistration(domainNode, subdomainLabel, owner_);
        emit LabelHash('subdomain node on etherscan:', keccak256(abi.encodePacked('0xce0457fe73731f824cc272376169235128c118b49d344817417c6d108d155e82', '0x21ef2a6ca60f101363c1d3752b43f448e3bf4ee950956b7ef24e71f17b836c26')));
        emit LabelHash('namehash("chicken.eth")', namehash('chicken'));
        // ens.setSubnodeOwner(keccak256(bytes('eth')), rootLabelHash, owner_);
        ens.setSubnodeOwner(domainNode, subdomainLabel, address(this));
        // Burn redemption token
    }
}


