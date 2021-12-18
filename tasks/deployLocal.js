const {MockProvider} = require('@ethereum-waffle/provider');
const {deployENS, ENS} = require('@ethereum-waffle/ens');

task('deploy-local', 'Deploy all contracts locally')
    .setAction(async (taskArgs, hre) => {
        const provider = new MockProvider();
        const [wallet] = provider.getWallets();
        const ens = await deployENS(wallet);

        const treasury = await hre.run('deploy:treasury')
        const nft = await hre.run('deploy:nft', {baseuri:'http://localhost:8081', oldContract: ens.ens.address});
        const marketplace = await hre.run('deploy:marketplace', {nft:nft.address, treasury: treasury.address});
    });
