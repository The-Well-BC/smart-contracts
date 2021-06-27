const namehash = require('eth-ens-namehash');

module.exports = async(well, registry) => {
    const domain = 'thewellis.xyz';
    const domainNode = namehash.hash(domain);
    // Deploy Registrar contract
    let Registrar = await ethers.getContractFactory('SubDomainRegistrar');
    let Resolver = await ethers.getContractFactory('WellCustomResolver');

    const resolver = await Resolver.deploy(registry.address);

    const registrar = await Registrar.deploy(registry.address,
        domainNode, well.address, resolver.address
    )

    await registrar.deployed();
    await resolver.deployed();

    return { registrar, resolver }
}

