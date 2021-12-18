const { ethers } = require('hardhat');

module.exports = async() => {
    // Deploy Registrar contract
    const SubgraphUpdater = await ethers.getContractFactory('SubgraphUpdater');
    const subgraphUpdater = await SubgraphUpdater.deploy();
    await subgraphUpdater.deployed();

    return { subgraphUpdater }
}
