module.exports = async(well, registry, domain) => {
    // Deploy Registrar contract
    let SubgraphUpdater = await ethers.getContractFactory('SubgraphUpdater');

    const subgraphUpdater = await SubgraphUpdater.deploy();

    await subgraphUpdater.deployed();
    console.log('SubgraphUpdater contract deployed at:', subgraphUpdater.address);

    return { subgraphUpdater }
}
