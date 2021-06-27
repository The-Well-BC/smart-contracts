const deploy = require('../scripts/deploy');

const { Wallet } = require('@ethersproject/wallet');
const {deployENS, ENS} = require('@ethereum-waffle/ens');
const namehash = require('eth-ens-namehash');

// const wallet = new Wallet(process.env.FUNDS_COLLECTOR, provider);

module.exports = async function() {
    // Set funds receiving wallet
    let accounts = await ethers.getSigners();
    let fundsCollector = accounts[9].address;

    // Setup ENS 
    let ens = await deployENS(accounts[0]);

    const domain = 'thewellis.xyz';
    const domainNode = namehash.hash(domain);

    await ens.setAddress(domain, accounts[0].address, {recursive:true})
    let registry = ens.ens;

    // Deploy contracts
    const { well, fresh, crowdsale, nft, registrar, resolver } = await deploy(fundsCollector, registry, domain);

    // Set registrar as owner of registry
    await registry.connect(accounts[0]).setOwner(domainNode, registrar.address);

    unitFresh  = 10 ** parseInt((await fresh.decimals()).toString());
    unitWell = 10 ** parseInt((await well.decimals()).toString());

    return { registrar, resolver, registry, ens, well, unitWell, fresh, unitFresh, crowdsale, accounts, nft }
}
