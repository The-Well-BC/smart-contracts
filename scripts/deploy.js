const hh = require('hardhat');

const nftDeploy = require('./nft');
const crowdsaleDeploy = require('./crowdsale');
const tokenDeploy = require('./tokens');
const registrarDeploy = require('./registrar');

module.exports = async function start(fundsCollectorAddress, registry) {
    const { well, fresh } = await tokenDeploy();
    const { resolver, registrar } = await registrarDeploy(well, registry);

    const crowdsale = await crowdsaleDeploy(fundsCollectorAddress);

    await well.grantMinterRole(crowdsale.address);
    await fresh.grantMinterRole(crowdsale.address);

    const nft = {};
    // const nft = await nftDeploy();

    return { well, fresh, crowdsale, nft, registrar, resolver };
}
