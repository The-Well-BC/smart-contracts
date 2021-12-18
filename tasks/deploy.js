const readline = require('./readline');

task('deploy', 'Deploy a contract')
    .addParam('contract', 'The contract to deploy')
    .addOptionalParam('baseuri', 'Base URI for NFT tokens')
    .addOptionalParam('oldContract', 'Contract address of the previous NFT contract')
    .setAction(async (taskArgs, hre) => {
        const { ethers } = hre;
        const signers = await ethers.getSigners();

        const { contract } = taskArgs;
        console.log('contract name:', contract);

        if( /nft/i.test(contract) ) {
            hre.run('deploy:nft');
        } else if( /marketplace/i.test(contract) ) {
            hre.run('deploy:marketplace');
        } else if( /treasury/i.test(contract)) {
            const Treasury = await ethers.getContractFactory('TheWellTreasury');
            const treasury = await Treasury.deploy();
            console.log('TheWell Treasury contract deployed at', treasury.address);
        } else if( /subgraphUpdate/i.test(contract)) {
            const SubgraphUpdater = await ethers.getContractFactory('SubgraphUpdater');
            const subgraphUpdater = await SubgraphUpdater.deploy();
            console.log('SubgraphUpdater contract deployed at:', subgraphUpdater.address);
        } else if( /registrar/i.test(contract)) {
            hre.run('deploy:registrar');
        } else
            console.log('Contract:', contract, 'not found!');
    });


task('deploy:nft', 'Deploy the WellNFT contract')
    .addParam('baseuri', 'Base URI for NFT tokens')
    .addParam('oldContract', 'Contract address of the previous NFT contract')
    .addOptionalParam('firstTokenId', 'What id should token ids start from?')
    .setAction(async (taskArgs, hre) => {
        const { ethers } = hre;
        const { oldContract, baseuri:baseURI, startTokenFrom } = taskArgs;

        console.log('baseuri:', baseURI, oldContract);
        if(!baseURI)
            throw new Error('token base uri required');
        if(!oldContract)
            throw new Error('oldContract missing. Need address of previous NFT contract');

        const nftDeploy = require('../deployScripts/nft');
        const nft = await nftDeploy({ baseURI, oldContract, startTokenFrom });
        console.log('TheWellNFT contract deployed at', nft.address);
        return nft;
    });

subtask('deploy:treasury', 'Deploy the treasury contract')
    .setAction(async(taskArgs) => {
        const treasuryDeploy = require('../deployScripts/treasury');
        const treasury = await treasuryDeploy();

        console.log('Treasury deployed at:', treasury.address);
        return treasury;
    });

subtask('deploy:marketplace', 'Deploy the marketplace contract')
    .addParam('nft', 'NFT address')
    .addParam('treasury', 'Treasury/Payment splitter address')
    .setAction(async(taskArgs) => {
        const { nft, treasury} = taskArgs;

        const marketplaceDeploy = require('../deployScripts/marketplace');
        const marketplace = await marketplaceDeploy({nft, treasury});
        console.log('Marketplace deployed at:', marketplace.address);
        return marketplace;
    });

subtask('deploy:registrar', 'Deploy The Well\'s subdomain resolver and registrar contracts')
    .addParam('token', 'Token sales will be conducted in')
    .addParam('domain', 'Domain to register subdomains for')
    .addOptionalParam('registryAddress', 'Contract of ENS registry')
    .setAction(async(taskArgs) => {
        const registrarDeploy = require('../deployScripts/registrar');
        const registryAddress = taskArgs.registryAddress || '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
        let { token, domain } = taskArgs;
        if(!domain)
            domain = 'the-well.xyz';

        const { resolver, registrar } = await registrarDeploy(token, registryAddress, domain);
    });
