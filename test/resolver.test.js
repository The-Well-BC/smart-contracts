const chai = require('chai');
const { expect } = chai;

const deploy = require('./deploy');

let Resolver, accounts;
const namehash = require('eth-ens-namehash');

describe('Test custom resolver: Setting custom hash', function() {
    before(async function() {
        const deployed = await deploy();
        const { resolver } = deployed;

        accounts = await ethers.getSigners();
        
        Resolver = resolver;
    });

    it('Set content hash and check', function() {
        const hash = '0xbabe';

        return Resolver.connect(accounts[0]).setContentHash(hash)
        .then(res => {
            expect(res).to.emit(Resolver, 'ContenthashChanged');

            return Resolver.contentHash()
        }).then(res => {
            expect(res).to.equal(hash);
        });
    });
});

