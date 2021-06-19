const chai = require('chai');

const { expect } = chai;

const Registrar = artifacts.require('SubDomainRegistrar');

contract('Test subdomain registration', function(accounts) {
    it('Register domain and redemption token', function() {
        return Registrar.new('0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e',
            'test-domains', '0xBF038425D88f7f10cB28df56Bb07c4d981898484'
        ).then(res => {
            expect(res).to.have.property('address');
        });
    });
});
