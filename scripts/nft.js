const hh = require('hardhat');

module.exports = async function main(auctionToken, baseURI = '') {
    const signers = await hh.ethers.getSigners();
    const TheWellNFT = await hh.ethers.getContractFactory('TheWellNFT');
    const Marketplace = await hh.ethers.getContractFactory('TheWellMarketplace');

    // NFT contract
    const nft = await TheWellNFT.deploy('The Well NFT', 'WELLNFT', baseURI);
    // Marketplace contract
    const marketplace = await Marketplace.deploy(signers[0].address);

    await nft.deployed();
    await marketplace.deployed();

    // Configuration
    nft.setMarketplaceContract(marketplace.address);
    marketplace.configure(nft.address);

    return { marketplace, nft };
}
