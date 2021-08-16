const deploy = require('./deploy');

const { Wallet } = require('@ethersproject/wallet');

// const wallet = new Wallet(process.env.FUNDS_COLLECTOR, provider);

const main = async function() {
    const domain = 'thewellis.xyz';
    const registry = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
    let baseURI = 'http://ipfs.gateway.io/ipfs/';

    const { well, fresh, nft, registrar, resolver, crowdsale } = await deploy(process.env.FUNDS_COLLECTOR, registry, domain, baseURI);

    console.log('Contracts deployed');
    console.log('WELL token:', well.address, '\nFRESH token:', fresh.address, 'The Well NFT:', nft.address);
    console.log('Collector Crowdsale:', crowdsale.address);
    console.log('Well Subdomain Registrar:', registrar.address, '\nThe Well Custom Resolver:', resolver.address);
    console.log('Collector Crowdsale:', crowdsale.address);
}

main()
.then(() => process.exit(0))
.catch(e => {
    console.error(e);
    process.exit(1);
});

