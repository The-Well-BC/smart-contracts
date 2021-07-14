const deploy = require('./deploy');

const { Wallet } = require('@ethersproject/wallet');


const setup = async function() {
    // Set funds receiving wallet
    // const wallet = new Wallet(process.env.FUNDS_COLLECTOR, provider);
    // let accounts = await ethers.getSigners();
    const fundsCollector = process.env.FUNDS_COLLECTOR;

    const domain = 'chicken.eth';
    const registryAddress = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';

    // Deploy contracts
    const { well, fresh, crowdsale, nft, registrar, resolver } = await deploy(fundsCollector, registryAddress, domain);

    console.log('Contracts deployed');
    console.log('WELL token:', well.address, '\nFRESH token:', fresh.address, '\nThe Well NFT:', nft.address);
    console.log('\nCollector Crowdsale:', crowdsale.address);
    console.log('\nWell Subdomain Registrar:', registrar.address, '\nWell Subdomain Resolver:', resolver.address);

    console.log('Remember to set the owner of your domain as the registrar address:', registrar.address);
}

setup()
.then(() => process.exit(0))
.catch(e => {
    console.error(e);
    process.exit(1);
});

