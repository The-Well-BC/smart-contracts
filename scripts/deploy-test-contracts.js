
const hh = require('hardhat');

module.exports = async function start(fundsCollectorAddress, registryAddress, domain, baseURI = '') {
    console.log('boom');
    const WETH9 = await ethers.getContractFactory('WETH9');
    const weth9 = await WETH9.deploy();

    console.log('DEPLOYING TESTER CONTRACTS');
    console.log('WETH9:', weth9.address);
    return { weth9 }
}

