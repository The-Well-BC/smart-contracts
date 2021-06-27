pragma solidity >=0.8.4;
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import './well.sol';
import '@ensdomains/ens-contracts/contracts/registry/ENS.sol';
import "./ERC20Minter.sol";

contract SubDomainRegistrar {
    bytes32 rootLabelHash;
    bytes32 domainNode;
    string domainString;
    address resolverAddress;

    // User address to subdomain string
    mapping(address => string) private userDomains;
    mapping(string => address) private userDomainReverse;

    ENS ens;

    ERC20Minter redeemToken;

    /**
     * Constructor.
     * @param ensAddr The address of the ENS registry.
     * @param domainNode_ Namehash of the domain that this registrar administers subdomains for.
     */
    constructor(address ensAddr, bytes32 domainNode_, ERC20Minter redeemToken_, address resolverAddress_) {
        ens = ENS(ensAddr);
        domainNode = domainNode_;
        redeemToken = redeemToken_;
        resolverAddress = resolverAddress_;
    }

    function namehash(bytes32 label_) public view returns (bytes32) {
        return keccak256(abi.encodePacked(domainNode, label_));
    }

    function name(address user_) external view returns (string memory) {
        return userDomains[user_];
    }

    event SubdomainRegistration(bytes32 domainNode_, bytes32 subdomainLabel, address payable owner);

    /**
     * @dev registers subdomains in exchange for x amount of tokens redeemToken
     */
    function register(string calldata subdomain_,  address payable owner_) external {
        require(owner_ == msg.sender, 'Sender must be owner of sudcomain');
        require(userDomainReverse[subdomain_] == address(0), 'Subdomain has already been registered');

        bytes32 subdomainLabel =  keccak256(bytes(subdomain_));

        // Burn redemption token
        uint256 amt = 10 ** redeemToken.decimals();
        require(
            redeemToken.balanceOf(owner_) > amt,
            'Not enough tokens'
        );
        redeemToken.burnFrom(owner_, amt);

        // Create subdomain record
        ens.setSubnodeRecord(domainNode, subdomainLabel, owner_, resolverAddress, 0);
        userDomains[owner_] = string( abi.encodePacked(subdomain_, domainString) );
        userDomainReverse[subdomain_] = owner_;

        emit SubdomainRegistration(domainNode, subdomainLabel, owner_);
    }
}
