const chai = require('chai');
const { expect } = chai;

const deploy = require('./deploy');

const namehash = require('eth-ens-namehash');

describe('Test subdomain registration', function() {
    let well, Registrar, ens,
    Registry, Resolver, accounts;

    const domain = 'thewellis.xyz';

    before(async function() {
        const deployed = await deploy();
        const { crowdsale, registry, registrar, resolver } = deployed;
        ens = deployed.ens;

        Registry = registry, Registrar = registrar, Resolver = resolver,
            well = deployed.well,

        accounts = await ethers.getSigners();
    });

    it('Trying to register subdomain without paying WELL should be rejected', function() {
        let account = accounts[3];
        return expect(
            Registrar.connect(account).register('shouldfail', account.address)
        ).to.be.revertedWith('Not enough tokens');
    });

    it('Checking names of non existent subdomains should equal false', async function() {
        return expect(
            await Registrar.name(accounts[4].address)
        ).to.equal('');
    });

    it('Register subdomain with empty string should revert', function() {
        // Init variables
        let signer, balance, decimals, registerTx, subdomain = 'newuser';

        before(async () => {
            signer = accounts[1];

        // Mint 1 well to user before buying
            return well.decimals()
            .then(res => {
                decimals = parseInt(res.toString());
                balance = 5 * (10 ** decimals);

                return well.mint(signer.address, (balance).toString());
            }).then(() => well.connect(signer).approve(Registrar.address, (10 ** decimals).toString()))
            .then(async () => {
                expect( await Registrar.connect(signer).register(subdomain, signer.address)
                ).to.revert;
            });
        });
    });

    describe('Registering subdomains', function() {
        // Init variables
        let signer, balance, decimals, registerTx, subdomain = 'newuser';

        before(async () => {
            signer = accounts[4];

        // Mint 1 well to user before buying
            return well.decimals()
            .then(res => {
                decimals = parseInt(res.toString());

                balance = 5 * (10 ** decimals);
                return well.mint(signer.address, (balance).toString());
            }).then(() => well.connect(signer).approve(Registrar.address, (10 ** decimals).toString()))
            .then(() => Registrar.connect(signer).register(subdomain, signer.address))
            .then(async res => {
                registerTx = await res.wait();
                console.log('REGIS TER TX:', registerTx.events);
            })
        })

        it('Check that subdomain is created', async function() {
            const subdomainRegistrationEvent = registerTx.events.some(log =>
                log.event == 'SubdomainRegistration');

            // Check SubdomainRegistration event
            expect( subdomainRegistrationEvent, 'Check that SubdomainRegistration is emitted' ).to.be.true;

            // Subdomain should be registered
            expect( await Registry.recordExists( namehash.hash(subdomain + '.' + domain)), 'Check subdomain exists').to.be.true;
        });

        it('Check that balance of 1 $WELL has been taken from user\'s wallet', async function() {
            // Account should be missing one $WELL token
            expect( (await well.balanceOf(signer.address)).toString())
                .to.equal((balance - (10 ** decimals)).toString());
        });

        it('Check that subdomain resolver is The Well\'s custom resolver', function() {
            return Registry.resolver(namehash.hash(subdomain + '.' + domain))
            .then(res => {
                expect(res).to.equal(Resolver.address);
            });
        });

        it('Check user\'s address is linked to their new subdomain', async function() {
            expect(await Registrar.name(signer.address)).to.equal(subdomain);
        });

        it('TX to register subdomain that has already been registered should be reverted', async function() {
            let user = accounts[8];

            await well.mint(user.address, (balance).toString());
            await well.connect(user).approve(Registrar.address, (10 ** decimals).toString());

            await expect(
                Registrar.connect(user).register(subdomain, user.address)
            ).to.be.revertedWith('Subdomain has already been registered');
        });
    });
});
