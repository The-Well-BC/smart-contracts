const hh = require('hardhat');

module.exports = async function() {
    // Deploy NFT, marketplace, and treasury contracts
    const signers = await hh.ethers.getSigners();
    const NFT = await hh.ethers.getContractFactory('WETH9');

    const weth9 = await NFT.deploy();
    await weth9.deployed();

    return { weth9 };
}
