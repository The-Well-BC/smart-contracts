const hh = require('hardhat');

module.exports = async function main(baseURI = '') {
    // Deploy NFT, marketplace, and treasury contracts
    const signers = await hh.ethers.getSigners();
    const NFT = await hh.ethers.getContractFactory('TheWellNFT');
    const Marketplace = await hh.ethers.getContractFactory('TheWellMarketplace');
    const Treasury = await hh.ethers.getContractFactory('TheWellTreasury');

    const nft = await NFT.deploy('The Well NFT', 'WELLNFT', baseURI);
    // Treasury contract
    const treasury = await Treasury.deploy();
    // Marketplace contract
    const marketplace = await Marketplace.deploy(signers[0].address, treasury.address);

    await nft.deployed();
    await marketplace.deployed();

    // Configuration
    nft.setMarketplaceContract(marketplace.address);
    marketplace.configure(nft.address);

    return { marketplace, nft };
}
