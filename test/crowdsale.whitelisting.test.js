const chai = require('chai');
chai.use(
    require('chai-as-promised')
);
const { expect } = chai;

let freshToken, wellToken, unitFresh, unitWell;
const FreshTokenContract = artifacts.require('Fresh');
const WellTokenContract = artifacts.require('Well');

const WhitelistCrowdsale = artifacts.require('CollectorCrowdsale');

contract.skip('Crowdsale: Test Whitelisting', function(accounts) {
    let packageIDs = [];
    let whitelistedBuyers = [
        accounts[4],
        accounts[5],
        accounts[6],
    ]

    let otherBuyers = [
        accounts[3],
        accounts[7],
        accounts[8],
    ]
    const price = web3.utils.toWei('25', 'ether');

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

            const packageName = 'First Package Tester blah blah';
            const tokenAddresses = [ freshToken.address, wellToken.address ];
            const tokenAmounts = [ (5 * unitFresh).toString(), unitWell.toString() ]

            return crowdsale.addPackage(packageName, price, tokenAddresses, tokenAmounts)
            .then(res => {
                packageIDs.push(res.logs[0].args.ID);
                return Promise.all(whitelistedBuyers.map(buyer => {
                    crowdsale.addToWhitelist(buyer);
                }));
            })
        });
    });

    it('Don\'t allow any purchases from buyers not on the whitelist', function() {
        const rateInWEI = 1;
        const buyer = accounts[3];

        return WhitelistCrowdsale.deployed()
        .then(crowdsale => {
            return expect(
                crowdsale.buyTokens(buyer, packageIDs[0], {from: buyer, value: price})
            ).to.be.rejectedWith('Address not allowed to buy token');
        });
    });

    it('#dev #bad  Process purchases from buyers on the whitelist', function() {
        const rateInWEI = 1;
        const buyer = accounts[3];
        const purchaseAmount = web3.utils.toWei('1', 'ether');

        return WhitelistCrowdsale.deployed()
        .then(crowdsale => {
            return whitelistedBuyers.map(buyer => {
                /*
                return expect(
                    crowdsale.buyTokens(buyer, packageIDs[0], {from: buyer, value: purchaseAmount})
                ).to.eventually.be.fulfilled;
                */
                console.log('Buyer:', buyer);
                return crowdsale.buyTokens(buyer, packageIDs[0], {from: buyer, value: purchaseAmount})
                .then(res => {
                    console.log('Bought tokens:', res);
                });
            })
            /*
            return expect( Promise.all( whitelistedBuyers.map(buyer => {
                crowdsale.buyTokens(buyer, packageIDs[0], {from: buyer, value: purchaseAmount})
            })))
            .to.all.be.fulfilled;
            */
        });
    });
});
