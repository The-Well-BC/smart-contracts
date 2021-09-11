pragma solidity ^0.8.4;
import '../Admin.sol';

contract AdminTester is WellAdmin {
    function adminTestFn() public view isAdmin returns(bool) {
        return true;
    }
    function superAdminTestFn() public view isSuperAdmin returns(bool) {
        return true;
    }
}
