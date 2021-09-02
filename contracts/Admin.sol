pragma solidity ^0.8.4;

// Single Admin
contract WellAdmin {
    uint256 private _numSuperAdmins;
    address _admin;
    mapping(address => bool) public _superAdminMappings;
    mapping(address => uint256) internal _superAdminIndex; // starts at 1

    mapping(bytes32 => uint256) public operationVotes;
    mapping(bytes32 => uint256) internal adminOperationMask;

    event NewAdmin(address _admin, bool isSuperAdmin);
    event VoteAdded(address _voter, bytes32 operation);

    constructor() {
        _numSuperAdmins = 0;

        _addSuperAdmin(msg.sender);
        addAdmin(msg.sender);
    }

    modifier wellAdmin() {
        require(_admin == msg.sender, 'is not admin');
        _;
    }

    modifier isSuperAdmin() {
        require(_superAdminMappings[msg.sender], 'is not superadmin');
        _;
    }

    function mostSuperAdmins(bytes32 operation) internal returns(bool) {
        if(_numSuperAdmins < 2 || (operationVotes[keccak256(msg.data)] > (_numSuperAdmins / 2)))
            return true;
        else
            return false;
    }

    function _addVote(bytes32 operation, address admin) internal {
        operationVotes[operation]++;
        adminOperationMask[operation] |= (2 ** (_superAdminIndex[admin] - 1));
        emit VoteAdded(msg.sender, operation);
    }

    function _addSuperAdmin(address _newSuperAdmin) private {
        require(_superAdminMappings[_newSuperAdmin] == false, 'admin already exists');
        require(_numSuperAdmins < 5);

        bytes32 op = keccak256(msg.data);
        if(_numSuperAdmins > 1)
            _addVote(op, msg.sender);

        if(mostSuperAdmins(op)) {
            _superAdminMappings[_newSuperAdmin] = true;
            _numSuperAdmins++;
            _superAdminIndex[_newSuperAdmin] = _numSuperAdmins;

            emit NewAdmin(_newSuperAdmin, true);

            // reset votes
            operationVotes[op] = 0;
            adminOperationMask[op] = 0;
        }
    }

    function addAdmin(address _newAdmin) public isSuperAdmin {
        bytes32 op = keccak256(msg.data);

        _admin = _newAdmin;

        emit NewAdmin(_newAdmin, false);
    }

    function addSuperAdmin(address _newAdmin) external isSuperAdmin {
        _addSuperAdmin(_newAdmin);
    }

    function removeAdmin(address _adminToRemove) public isSuperAdmin {
        _admin = address(0);
    }

    function removeSuperAdmin(address _adminToRemove) public isSuperAdmin {
        bytes32 op = keccak256(msg.data);
        if(_numSuperAdmins > 1)
            _addVote(op, msg.sender);

        if(mostSuperAdmins(op)) {
            require(_numSuperAdmins > 1, 'too few superadmins');
            _superAdminMappings[_adminToRemove] = false;
            _numSuperAdmins--;
        }
    }
}
