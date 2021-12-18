const hh = require('hardhat');

module.exports = async function main(args) {

    const {marketplace, oldNFTContract, tokenStartsFrom} = args;

    const tokenStart = args.tokenStartsFrom || args.startTokenFrom || args.tokenStart || args.tokenStartID || 1;

    const baseURI = args.baseURI || args.baseuri || '';

    if(!baseURI || !oldNFTContract)
        throw new Error('Missing parameter');

    const signers = await hh.ethers.getSigners();
    const NFT = await hh.ethers.getContractFactory('TheWellNFT');

    const nft = await NFT.deploy('The Well NFT', 'WELLNFT', baseURI, oldNFTContract, tokenStart);

    await nft.deployed();

    // Configuration
    if(marketplace)
        nft.setMarketplaceContract(marketplace.address);

    return nft;
}
