const chai = require('chai');
chai.use(
    require('chai-as-promised'));

const { expect } = chai;

const {MockProvider} = require('@ethereum-waffle/provider');
const {deployENS, ENS} = require('@ethereum-waffle/ens');

const Registrar = artifacts.require('SubDomainRegistrar');
const Well = artifacts.require('Well');
let ens, registrarAddress, registryAddress;
const namehash = require('eth-ens-namehash');

let wellContract;

contract.only('Test subdomain registration', function(accounts) {
    let registrar;

    const provider = new MockProvider();
    const [wallet] = provider.getWallets();
    const domain = 'testie.eth';
    const domainNode = namehash.hash(domain);
    console.log('domain node:', domainNode);
    console.log('domain hash:', web3.utils.sha3(domainNode));
    console.log('testie label hash:', web3.utils.sha3('testie'));

    console.log('ook.chicken namehash', namehash.hash('ook.chicken'));
    console.log('chicken.eth namehash', namehash.hash('chicken.eth'));
    console.log('pak.chicken namehash', namehash.hash('pak.chicken'));
    before(() => {
        // Register domain first with ens
        return deployENS(wallet)
        .then(res => {
            ens = res;
            return ens.createTopLevelDomain('eth')
        }).then(res => {
            return ens.createSubDomain(domain);
        }).then(res => {
            registrarAddress = ens.registrars.eth.address;
            // console.log('ENS:', ens);
            // console.log('Checking for registry:', ens.registry);
            registryAddress = ens.ens.address
            console.log('Registry ADdress:', registryAddress);
            console.log('Registrar deployed', registrarAddress);

            return Well.deployed()
        })
        .then(res => {
            wellContract = res;
            /*
            return Registrar.new(registrarAddress,
                domainNode)
            */
            return Registrar.new(registryAddress,
                domainNode, wellContract.address)
        }).then(res => {
            registrar = res;
        });
    });

    it('Trying to register subdomain without paying WELL should be rejected', function() {
        console.log('Subdomain label:', web3.utils.sha3('shouldfail'));
        return expect(
            // registrar.register('should_fail', 1, accounts[3])
            registrar.register('shouldfail', accounts[3], {from:accounts[3]})
        ).to.be.rejected;
    });

    it('Register subdomain if payment of 1 $WELL is made', function() {
        let user = accounts[4];
        // Mint 1 well to user before buying
        return wellContract.decimals()
        .then(decimals => {
            console.log('Decimals:', decimals);
            decimals = parseInt(decimals.toString());

            return wellContract.mint(accounts[4], (10 ** decimals).toString());
        }).then(res => {
            return registrar.register('newuser', user, {from:user})
            // return registrar.register('newuser', 1, user, {from: user})
        }).then(res => {
            console.log('Registered new subdomain newuser.test-domains.eth', res);
        });
    });
});
