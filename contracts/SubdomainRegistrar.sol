pragma solidity >=0.8.4;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import '@ensdomains/ens-contracts/contracts/registry/ENS.sol';

contract SubDomainRegistrar {
    bytes32 constant TLD_LABEL = keccak256("eth");

    // namehash('eth')
    bytes32 constant public TLD_NODE = 0x93cdeb708b7545dc668eb9280176169d1c33cfd8ed6f04690a0bcc88a93fc4ae;
    bytes32 rootLabelHash;

    ENS ens;

    IERC20 redeemToken;

    // name to subdomain mapping
    mapping(string => address) subdomains;

    /**
     * Constructor.
     * @param ensAddr The address of the ENS registry.
     * @param domainName The domain name that this registrar administers subdomains for.
     */
    constructor(ENS ensAddr, string memory domainName, IERC20 redeemToken_) {
        ens = ensAddr;
        rootLabelHash = keccak256(bytes(domainName));
        redeemToken = redeemToken_;
    }

    function namehash(bytes32 node_, bytes32 label_) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(node_, label_));
    }

    /**
     * @dev registers subdomains in exchange for x amount of tokens redeemToken
     */
    function register(string calldata subdomain_,  uint256 tokenAmount, address payable owner_) external {
        bytes32 subdomainLabel =  keccak256(bytes(subdomain_));
        bytes32 domainNode = keccak256(abi.encodePacked(TLD_NODE, rootLabelHash));

        ens.setSubnodeOwner(domainNode, subdomainLabel, owner_);
    }
}

