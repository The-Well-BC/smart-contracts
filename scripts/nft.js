const hh = require('hardhat');

module.exports = async function main(baseURI = '') {
    const TheWellNFT = await hh.ethers.getContractFactory('TheWellNFT');
    const nft = await TheWellNFT.deploy('The Well NFT', 'WELLNFT', baseURI);

    await nft.deployed();

    return nft;
}
