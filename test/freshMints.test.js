const chai = require('chai');
chai.use(
    require('chai-as-promised')
);
const { expect } = chai;

let freshToken, wellToken;
const FreshTokenContract = artifacts.require('Fresh');
const WellTokenContract = artifacts.require('Well');

const WhitelistCrowdsale = artifacts.require('WhitelistCrowdsale');

contract('Crowdsale: Test sale', function(accounts) {
    let crowdsale;
    // 1 $WELL = 25 ETH
    const tokensPerWei = 4;

    before(function() {
        return Promise.all([
            WellTokenContract.new(),
            FreshTokenContract.new()
        ])
        .then(res => {
            wellToken = res[0];
            freshToken = res[1];
            return WhitelistCrowdsale.new(tokensPerWei, accounts[0], wellToken.address, freshToken.address)
        })
        .then(res => {
            crowdsale = res;

            return Promise.all([
                wellToken.grantMinterRole(crowdsale.address),
                freshToken.grantMinterRole(crowdsale.address)
            ])
            .then(res => {
                console.log('Granted MInter Role to :', crowdsale.address)
                console.log(res);
            });
        });
    });

    it('Pay 25ETH, get 1 $WELL, 5 $FRESH tokens', function() {
        const buyer = accounts[2];
        const purchaseAmount = web3.utils.toWei('25', 'ether');

        return crowdsale.addToWhitelist(buyer)
        .then(() => crowdsale.buyTokens(buyer, {from: buyer, value: purchaseAmount }))
        .then(res => {
            expect(res.logs[0]).to.have.property('event', 'TokensPurchased');

            expect(res.logs[0].args.value.toString()).to.equal(purchaseAmount);
            expect(res.logs[0].args.amount.toString()).to.equal((10**20).toString());

            return wellToken.balanceOf(buyer)
            .then(res => {
                expect(res.toString()).to.equal((10**20).toString());
                return freshToken.balanceOf(buyer)
            }).then(res => {
                expect(res.toString()).to.equal('5');
            });
        });
    });
    it('Pay 50ETH, get 1 $WELL, 10 $FRESH tokens', function() {
        const buyer = accounts[5];
        const purchaseAmount = web3.utils.toWei('50', 'ether');

        return crowdsale.addToWhitelist(buyer)
        .then(() => crowdsale.buyTokens(buyer, {from: buyer, value: purchaseAmount }))
        .then(res => {
            console.log('Bought tokens:', res);
            console.log('Bought tokens: Receipt Logs:', res.receipt.logs);
            console.log('Bought tokens: Logs:', res.logs[0]);

            expect(res.logs[0]).to.have.property('event', 'TokensPurchased');

            expect(res.logs[0].args.value.toString()).to.equal(purchaseAmount);
            expect(res.logs[0].args.amount.toString()).to.equal((2 * (10**20)).toString());

            return wellToken.balanceOf(buyer)
            .then(res => {
                expect(res.toString()).to.equal((2 * (10**20)).toString());
                return freshToken.balanceOf(buyer)
            }).then(res => {
                expect(res.toString()).to.equal('5');
            });
        });
    });
});

contract('Crowdsale: Test Whitelisting', function(accounts) {
    before(function() {
        return FreshTokenContract.new()
        .then(res => {
            freshToken = res;
        });
    });

    it('Don\'t allow any purchases because no buyers have been set', function() {
        const rateInWEI = 1;
        const buyer = accounts[3];
        const purchaseAmount = web3.utils.toWei('10', 'ether');

        return WhitelistCrowdsale.new(rateInWEI, accounts[0], wellToken.address, freshToken.address)
        .then(crowdsale => {
            return expect(
                crowdsale.buyTokens(buyer, {from: buyer, value: purchaseAmount})
            ).to.be.rejectedWith('Address not allowed to buy token');
        });
    });
});
