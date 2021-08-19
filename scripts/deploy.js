const hh = require('hardhat');

const nftDeploy = require('./nft');
const crowdsaleDeploy = require('./crowdsale');
const tokenDeploy = require('./tokens');
const registrarDeploy = require('./registrar');

function checkParameters() {
    return Object.values(arguments).every(arg => {
        return arg != ''
            && arg != null && arg != undefined && arg != false;
    });
}

module.exports = async function start(fundsCollectorAddress, registryAddress, domain, baseURI = '') {
    /** PRE DEPLOYMENTS
     * Check parameters
     * First check that no paramters are missing
     */
    if(checkParameters(fundsCollectorAddress, registryAddress, domain) !== true)
        throw new Error('Missing parameter');

    // Then check that parametrs are all valid
    if(typeof registryAddress !== 'string')
        throw new Error('Registry address should be a string');
    if(typeof fundsCollectorAddress !== 'string')
        throw new Error('Funds collector address should be a string');

    const tlds = ['eth', 'xyz', 'luxe', 'cred', 'art'];
    if(typeof domain !== 'string')
        throw new Error('Domain should be a string');
    if(domain.match(/\./g).length !== 1)
        throw new Error('Domain should be a top level domain');

    if(tlds.includes(domain.match(/(?<=\.).*$/g)[0]) !== true)
        throw new Error('Domain should be a ' + tlds.join(', .') + 'domain');

    // Deploy contracts
    const { well, fresh } = await tokenDeploy();
    const { resolver, registrar } = await registrarDeploy(well, registryAddress, domain);

    const crowdsale = await crowdsaleDeploy(fundsCollectorAddress);

    await well.grantMinterRole(crowdsale.address);
    await fresh.grantMinterRole(crowdsale.address);

    const { nft, marketplace } = await nftDeploy(baseURI);

    // Payment Splitter contract
    const PaymentSplitter = await hh.ethers.getContractFactory('TheWellPaymentSplitter');
    const paymentSplitter = await PaymentSplitter.deploy();
    paymentSplitter.setNFTContract(nft.address);
    nft.setPaymentContract(paymentSplitter.address);

    return { well, fresh, crowdsale, nft, marketplace, registrar, resolver, paymentSplitter };
}
