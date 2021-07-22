const deploy = require('./deploy');

const { Wallet } = require('@ethersproject/wallet');
const {deployENS, ENS} = require('@ethereum-waffle/ens');
const namehash = require('eth-ens-namehash');

// const wallet = new Wallet(process.env.FUNDS_COLLECTOR, provider);

const setup = async function() {
    // Set funds receiving wallet
    let accounts = await ethers.getSigners();
    let fundsCollector = accounts[9].address;

    // Setup ENS 
    let ens = await deployENS(accounts[0]);

    const domain = 'thewellis.xyz';
    const domainNode = namehash.hash(domain);

    await ens.setAddress(domain, accounts[0].address, {recursive:true})
    let registry = ens.ens;
    let baseURI = 'http://localhost:8002/ipfs/';

    // Deploy contracts
    const { well, fresh, crowdsale, nft, registrar, resolver } = await deploy(fundsCollector, registry.address, domain, baseURI);

    // Set registrar as owner of registry
    await registry.connect(accounts[0]).setOwner(domainNode, registrar.address);

    console.log('Contracts deployed');
    console.log('WELL token:', well.address, '\nFRESH token:', fresh.address, '\nThe Well NFT:', nft.address);
    console.log('\nCollector Crowdsale:', crowdsale.address);
    console.log('\nWell Subdomain Registrar:', registrar.address, '\nWell Subdomain Resolver:', resolver.address);
}

setup()
.then(() => process.exit(0))
.catch(e => {
    console.error(e);
    process.exit(1);
});

