const namehash = require('eth-ens-namehash');
const { ethers } = require('hardhat');

module.exports = async(well, registry, domain) => {
    const domainNode = namehash.hash(domain);
    // Deploy Registrar contract
    let Registrar = await ethers.getContractFactory('SubDomainRegistrar');
    let Resolver = await ethers.getContractFactory('WellCustomResolver');

    const resolver = await Resolver.deploy(registry);

    const registrar = await Registrar.deploy(registry,
        domainNode, well.address, resolver.address
    )

    await registrar.deployed();
    await resolver.deployed();

    return { registrar, resolver }
}

