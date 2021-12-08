// SPDX-License-Identifier: GPL-3.0


pragma solidity ^0.8.4;

/**
This contract will be used to update the subgraph
*/
contract SubgraphUpdater {
    event UpdateSubgraph(string message, string[] params);

    function update(string memory message, string[] memory params) external returns(bool) {
        emit UpdateSubgraph(message, params);

        return true;
    }
}
