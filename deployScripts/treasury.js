const hh = require('hardhat');

module.exports = async function main(baseURI = '', oldNFTContract, tokenStartsFrom=1) {
    const signers = await hh.ethers.getSigners();
    const Treasury = await hh.ethers.getContractFactory('TheWellTreasury');
    const treasury = await Treasury.deploy();

    return treasury;
}
