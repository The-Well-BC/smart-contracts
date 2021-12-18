const hh = require('hardhat');

module.exports = async function main({nft, treasury}) {
    const signers = await hh.ethers.getSigners();
    const Marketplace = await hh.ethers.getContractFactory('TheWellMarketplace');

    if(!nft || !treasury)
        throw new Error('Missing deploy variable');

    const marketplace = await Marketplace.deploy(signers[0].address, treasury);
    await marketplace.deployed();

    // Configuration
    marketplace.configure(nft);

    return marketplace;
}
