pragma solidity ^0.8.4;

// Single Admin
contract WellAdmin {
    uint256 private _totalSuperAdmins; // Total number of superadmins
    uint256 private _totalSuperAdminsAdded; // +1 everytime a superadmin is added. Never decreased.
    address public _admin;
    mapping(address => uint256) internal _superAdminIndex; // starts at 1

    mapping(bytes32 => uint256) internal operationVotes;
    mapping(bytes32 => uint256) internal adminOperationMask;

    event NewAdmin(address _admin, bool isSuperAdmin);
    event RemoveAdmin(address _admin, bool isSuperAdmin);
    event VoteAdded(address _voter, bytes32 operation);

    constructor() {
        _totalSuperAdmins = 0;
        _totalSuperAdminsAdded = 0;

        _addSuperAdmin(msg.sender);
        addAdmin(msg.sender);
    }

    modifier isAdmin() {
        require(_admin == msg.sender, 'is not Admin');
        _;
    }

    modifier isSuperAdmin() {
        require(_superAdminIndex[msg.sender] != 0, 'is not Superadmin');
        _;
    }

    function _hasEnoughVotes(bytes32 operation) internal view returns(bool) {
        if(_totalSuperAdmins < 2 || (operationVotes[operation] > (_totalSuperAdmins / 2))) {
            return true;
        } else
            return false;
    }

    function _resetVotes(bytes32 operation) internal {
        delete operationVotes[operation];
        delete adminOperationMask[operation];
    }

    function _addVote(bytes32 operation, address admin) internal {
        // Check that superadmin hasn't already voted.
        require( adminOperationMask[operation] & (2 ** (_superAdminIndex[admin] - 1)) == 0, 'Duplicate vote');

        operationVotes[operation]++;
        adminOperationMask[operation] |= (2 ** (_superAdminIndex[admin] - 1));
        emit VoteAdded(msg.sender, operation);
    }

    function _addSuperAdmin(address _newSuperAdmin) private {
        require(_superAdminIndex[_newSuperAdmin] == 0, 'Superadmin already exists');
        require(_totalSuperAdmins < 5);

        bytes32 op = keccak256(msg.data);

        if(_totalSuperAdmins > 1)
            _addVote(op, msg.sender);

        if(_hasEnoughVotes(op)) {
            _superAdminIndex[_newSuperAdmin] > 0;
            _totalSuperAdmins++;
            _totalSuperAdminsAdded++;
            _superAdminIndex[_newSuperAdmin] = _totalSuperAdminsAdded;

            emit NewAdmin(_newSuperAdmin, true);

            _resetVotes(op);
        }
    }

    function addAdmin(address _newAdmin) public isSuperAdmin {
        _admin = _newAdmin;

        emit NewAdmin(_newAdmin, false);
    }

    function addSuperAdmin(address _newAdmin) external isSuperAdmin {
        _addSuperAdmin(_newAdmin);
    }

    function removeAdmin() public isSuperAdmin {
        _admin = address(0);
    }

    function removeSuperAdmin(address _adminToRemove) public isSuperAdmin {
        require(_totalSuperAdmins > 1, 'too few superadmins');
        require(_superAdminIndex[_adminToRemove] != 0, 'admin already removed');

        bytes32 op = keccak256(msg.data);
        if(_totalSuperAdmins > 1)
            _addVote(op, msg.sender);

        if(_hasEnoughVotes(op)) {
            delete _superAdminIndex[_adminToRemove];
            _totalSuperAdmins--;

            _resetVotes(op);
        }
    }
}
