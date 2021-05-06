const chai = require('chai');
chai.use(
    require('chai-as-promised')
);
const { expect } = chai;

let freshToken, wellToken, unitFresh, unitWell;
const FreshTokenContract = artifacts.require('Fresh');
const WellTokenContract = artifacts.require('Well');

const WhitelistCrowdsale = artifacts.require('WhitelistCrowdsale');

contract('Crowdsale: Test sale', function(accounts) {
    let crowdsale;
    // 1 $WELL = 25 ETH
    const tokensPerWei = 4;

    before(() => {
        return Promise.all([
            FreshTokenContract.deployed(), WellTokenContract.deployed(),
            WhitelistCrowdsale.deployed()
        ])
        .then(res => {
            freshToken = res[0]; wellToken = res[1];
            crowdsale = res[2];

            return Promise.all([
                freshToken.decimals(), wellToken.decimals()
            ])
        })
        .then(res => {
            unitFresh = 10 ** parseInt(res[0].toString());
            unitWell = 10 ** parseInt(res[1].toString());;
        });
    });

    it('Pay 25ETH, get 1 $WELL, 5 $FRESH tokens', function() {
        const buyer = accounts[2];
        const purchaseAmount = web3.utils.toWei('25', 'ether');

        console.log('Fresh Addr:', FreshTokenContract.address);
        console.log('Crowdsale Addr:', WhitelistCrowdsale.address);

        return crowdsale.addToWhitelist(buyer)
        .then(() => crowdsale.buyTokens(buyer, {from: buyer, value: purchaseAmount }))
        .then(res => {
            expect(res.logs[0]).to.have.property('event', 'TokensPurchased');

            expect(res.logs[0].args.value.toString()).to.equal(purchaseAmount);
            expect(res.logs[0].args.amount.toString()).to.equal(unitWell.toString());

            return wellToken.balanceOf(buyer)
            .then(res => {
                expect(res.toString()).to.equal(unitWell.toString());
                return freshToken.balanceOf(buyer)
            }).then(res => {
                expect(res.toString()).to.equal((5 * unitFresh).toString());
            });
        });
    });
    it('Pay 50ETH, get 1 $WELL, 10 $FRESH tokens', function() {
        const buyer = accounts[5];
        const purchaseAmount = web3.utils.toWei('50', 'ether');

        return crowdsale.addToWhitelist(buyer)
        .then(() => crowdsale.buyTokens(buyer, {from: buyer, value: purchaseAmount }))
        .then(res => {

            expect(res.logs[0]).to.have.property('event', 'TokensPurchased');

            expect(res.logs[0].args.value.toString()).to.equal(purchaseAmount);
            expect(res.logs[0].args.amount.toString()).to.equal((2 * unitWell).toString());

            return wellToken.balanceOf(buyer)
            .then(res => {
                expect(res.toString()).to.equal((2 * unitWell).toString());
                return freshToken.balanceOf(buyer)
            }).then(res => {
                expect(res.toString()).to.equal((5 * unitFresh).toString());
            });
        });
    });
});

contract('Crowdsale: Test Whitelisting', function(accounts) {
    before(function() {
        return Promise.all([
            FreshTokenContract.deployed(), WellTokenContract.deployed(),
            WhitelistCrowdsale.deployed()
        ])
        .then(res => {
            freshToken = res[0]; wellToken = res[1];
            crowdsale = res[2];

            return Promise.all([
                freshToken.decimals(), wellToken.decimals()
            ])
        })
        .then(res => {
            unitFresh = 10 ** parseInt(res[0].toString());
            unitWell = 10 ** parseInt(res[1].toString());;
        });
    });

    it('Don\'t allow any purchases because no buyers have been set', function() {
        const rateInWEI = 1;
        const buyer = accounts[3];
        const purchaseAmount = web3.utils.toWei('10', 'ether');

        return WhitelistCrowdsale.deployed()
        .then(crowdsale => {
            return expect(
                crowdsale.buyTokens(buyer, {from: buyer, value: purchaseAmount})
            ).to.be.rejectedWith('Address not allowed to buy token');
        });
    });
});
