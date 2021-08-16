contract WellAdmin {
    // Admin address
    address[10] private _wellAdmins;
    uint256 private _numAdmins;
    mapping(address => bool) private _adminMappings;

    constructor() {
        _numAdmins = 0;
        _addAdmin(msg.sender);
    }

    modifier wellAdmin() {
        require(_adminMappings[msg.sender], 'Caller is not admin');
        _;
    }

    function _addAdmin(address _newAdmin) private {
        _wellAdmins[_numAdmins] = _newAdmin;
        _adminMappings[msg.sender] = true;
        _numAdmins++;
    }

    function addAdmin(address _newAdmin) wellAdmin public {
        _addAdmin(_newAdmin);
    }

    function removeAdmin(address _adminToRemove) wellAdmin public {
        _adminMappings[msg.sender] = false;
        _numAdmins--;
    }
}
