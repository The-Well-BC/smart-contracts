const deploy = require('./deploy');

const { Wallet } = require('@ethersproject/wallet');

// const wallet = new Wallet(process.env.FUNDS_COLLECTOR, provider);

const main = async function() {
    const { well, fresh, nft, registrar, resolver, crowdsale } = await deploy(process.env.FUNDS_COLLECTOR, process.env.ENS_REGISTRY);

    console.log('Contracts deployed');
    console.log('WELL token:', well.address, '\nFRESH token:', fresh.address, 'The Well NFT:', nft.address);
    console.log('Well Subdomain Registrar:', registrar.address, '\nThe Well Custom Resolver:', resolver.address, '\nCollector Crowdsale:', crowdsale.address);
}

main()
.then(() => process.exit(0))
.catch(e => {
    console.error(e);
    process.exit(1);
});

