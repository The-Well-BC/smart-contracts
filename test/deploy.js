const nftDeploy = require('../deployScripts/nft');
const marketDeploy = require('../deployScripts/marketplace');
const crowdsaleDeploy = require('../deployScripts/crowdsale');
const tokenDeploy = require('../deployScripts/tokens');
const registrarDeploy = require('../deployScripts/registrar');
const miscDeploys = require('../deployScripts/misc');

const { ethers } = require('hardhat');
const {deployENS} = require('@ethereum-waffle/ens');
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
    // const { well, fresh, crowdsale, registrar, resolver, paymentSplitter } = await deploy(fundsCollector, registry.address, domain, baseURI);

    const { well, fresh } = await tokenDeploy();
    const oldNFT = await nftDeploy({baseURI, oldNFTContract: well.address, tokenStartsFrom:1});
    const nft = await nftDeploy({baseURI, oldNFTContract:oldNFT.address, tokenStartsFrom:1});

    const marketplace = await marketDeploy({nft: nft.address, treasury: well.address});

    const { resolver, registrar } = await registrarDeploy(well, registry.address, domain);

    const crowdsale = await crowdsaleDeploy(fundsCollector);

    await well.grantMinterRole(crowdsale.address);
    await fresh.grantMinterRole(crowdsale.address);

    const misc = await miscDeploys();

    // Payment Splitter contract
    const PaymentSplitter = await ethers.getContractFactory('TheWellPaymentSplitter');
    const paymentSplitter = await PaymentSplitter.deploy();

    paymentSplitter.setNFTContract(nft.address);
    nft.setPaymentContract(paymentSplitter.address);

    const WETH9 = await ethers.getContractFactory('WETH9');
    const weth = await WETH9.deploy();

    marketplace.addPurchaseToken(weth.address);

    // Set registrar as owner of registry
    await registry.connect(accounts[0]).setOwner(domainNode, registrar.address);

    const unitFresh  = 10 ** parseInt((await fresh.decimals()).toString());
    const unitWell = 10 ** parseInt((await well.decimals()).toString());

    return { baseURI, registrar, resolver, registry, ens, well, unitWell, fresh, weth, unitFresh, crowdsale, accounts, nft, marketplace, paymentSplitter }
}
