pragma solidity ^0.8.4;

contract WellAdmin {
    uint256 private _numSuperAdmins;
    uint256 private _numAdmins;
    mapping(address => bool) private _adminMappings;
    mapping(address => bool) private _superAdminMappings;

    constructor() {
        _numAdmins = 0; _addAdmin(msg.sender, 'admin');
        _numSuperAdmins = 0; _addAdmin(msg.sender, 'superAdmin');
    }

    modifier wellAdmin() {
        require(_adminMappings[msg.sender]);
        _;
    }

    modifier isSuperAdmin() {
        require(_superAdminMappings[msg.sender]);
        _;
    }

    function _addAdmin(address _newAdmin, string memory adminType) private {
        if(keccak256(abi.encodePacked(adminType)) == keccak256(abi.encodePacked('admin'))) {
            _adminMappings[_newAdmin] = true;
            _numAdmins++;
        } else if(keccak256(abi.encodePacked(adminType)) == keccak256(abi.encodePacked('superAdmin'))) {
            require(_numSuperAdmins <= 3);
            _superAdminMappings[_newAdmin] = true;
            _numSuperAdmins++;
        }
    }

    function addAdmin(address _newAdmin, string calldata adminType) public isSuperAdmin {
        _addAdmin(_newAdmin, adminType);
    }

    function removeAdmin(address _adminToRemove) public isSuperAdmin {
        _adminMappings[_adminToRemove] = false;
        _numAdmins--;
    }

    function removeSuperAdmin(address _adminToRemove) public isSuperAdmin {
        _superAdminMappings[_adminToRemove] = false;
        _numSuperAdmins--;
    }
}
