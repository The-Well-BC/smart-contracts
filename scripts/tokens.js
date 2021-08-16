const hh = require('hardhat');

module.exports = async function() {
    const Well = await hh.ethers.getContractFactory('Well');
    const Fresh = await hh.ethers.getContractFactory('Fresh');

    const well = await Well.deploy();
    const fresh = await Fresh.deploy();

    await Promise.all([
        well.deployed(),
        fresh.deployed(),
    ]);

    return { well, fresh }
}
