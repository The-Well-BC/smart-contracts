const chai = require('chai');
chai.use(
    require('chai-as-promised'));

const { expect } = chai;

const Registrar = artifacts.require('SubDomainRegistrar');

contract('Test subdomain registration', function(accounts) {
    let registrar;
    before(() => {
        return Registrar.new('0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
            'test-domains', '0xBF038425D88f7f10cB28df56Bb07c4d981898484'
        ).then(res => {
            registrar=res;
        });
    });

    it('Trying to register subdomain without paying WELL should be rejected', function() {
        return expect(
            registrar.register('should_fail', 1, accounts[0])
        ).to.be.rejected;
    });

    it('Register subdomain if payment of 1 $WELL is made', function() {
    });
});
