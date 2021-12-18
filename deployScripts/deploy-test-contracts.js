const { ethers } = require('hardhat');

module.exports = async function start() {
    const WETH9 = await ethers.getContractFactory('WETH9');
    const weth9 = await WETH9.deploy();

    return { weth9 }
}

