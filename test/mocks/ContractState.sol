pragma solidity ^0.8.0;

contract ContractState {
    struct Parameter {
        string type_;
        bytes value;
    }

    struct ParameterList {
        Parameter[] parameters;
    }

    /*
    function _getStoragePointer(string calldata storageVar) internal returns(uint) {
        return 12;
    }

    function setState(string memory varName, bytes memory data) external {
        assembly {
             sstore(varName, data)
        }
    }
    */
}
