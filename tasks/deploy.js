function deployNFT() {
}

task('deploy', 'Deploy a contract')
    .addParam('contract', 'The contract name')
    .addOptionalParam('baseuri', 'Base URI for NFT tokens')
    .setAction(async (taskArgs) => {
        const { ethers } = hre;
        const signers = await ethers.getSigners();

        const { contract, baseuri:baseURI } = taskArgs;

        if( /nft/i.test(contract) ) {
            const NFT = await ethers.getContractFactory('TheWellNFT');
            const nft = await NFT.deploy('The Well NFT', 'WELLNFT', baseURI, {gasLimit: 2677247});
            await nft.deployed();
            console.log('TheWellNFT contract deployed at', nft.address);

        } else if( /marketplace/i.test(contract) ) {
            const Marketplace = await ethers.getContractFactory('TheWellMarketplace');
            const marketplace = await Marketplace.deploy(signers[0].address, treasury.address);
            await marketplace.deployed();
            marketplace.configure(nft.address);
            console.log('TheWell Marketplace contract deployed at', marketplace.address);

        } else if( /treasury/i.test(contract)) {
            const Treasury = await ethers.getContractFactory('TheWellTreasury');
            const treasury = await Treasury.deploy();
            console.log('TheWell Treasury contract deployed at', treasury.address);
        } else if( /subgraphUpdate/i.test(contract)) {
            const SubgraphUpdater = await ethers.getContractFactory('SubgraphUpdater');
            const subgraphUpdater = await SubgraphUpdater.deploy();
            console.log('SubgraphUpdater contract deployed at:', subgraphUpdater.address);
        } else
            console.log('Contract:', contract, 'not found!');
    });



