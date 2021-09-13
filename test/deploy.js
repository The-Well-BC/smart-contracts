const deploy = require('../scripts/deploy');

const { ethers } = require('hardhat');
const { Wallet } = require('@ethersproject/wallet');
const {deployENS, ENS} = require('@ethereum-waffle/ens');
const namehash = require('eth-ens-namehash');

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
    let baseURI = 'http://localhost:8002/ipfs/';

    // Deploy contracts
    const { well, fresh, crowdsale, nft, marketplace, registrar, resolver, paymentSplitter } = await deploy(fundsCollector, registry.address, domain, baseURI);

    const WETH9 = await ethers.getContractFactory('WETH9');
    const weth = await WETH9.deploy();

    marketplace.addPurchaseToken(weth.address);

    // Set registrar as owner of registry
    await registry.connect(accounts[0]).setOwner(domainNode, registrar.address);

    unitFresh  = 10 ** parseInt((await fresh.decimals()).toString());
    unitWell = 10 ** parseInt((await well.decimals()).toString());

    return { baseURI, registrar, resolver, registry, ens, well, unitWell, fresh, weth, unitFresh, crowdsale, accounts, nft, marketplace, paymentSplitter }
}
