const chai = require('chai');
chai.use(
    require('chai-as-promised')
);
const { expect } = chai;

let freshToken, wellToken, unitFresh, unitWell;
const FreshTokenContract = artifacts.require('Fresh');
const WellTokenContract = artifacts.require('Well');

const WhitelistCrowdsale = artifacts.require('CollectorCrowdsale');

contract('Crowdsale: Sell tokens', function(accounts) {
    let crowdsale;
    // 1 $WELL = 25 ETH
    let packages = [{
        id: null, tokens: { well: 2 },
        name: 'Single Token Package', price: web3.utils.toWei('5', 'ether')
    }, {
        id: null, tokens: { well: 10, fresh: 5 },
        name: 'Multi token package', price: web3.utils.toWei('25', 'ether')
    }];

    let packageIDs = [];
    const price = web3.utils.toWei('25', 'ether');

    let whitelistedBuyers = [
        accounts[4],
        accounts[5],
        accounts[6],
        accounts[7],
    ]

    before(() => {
        return Promise.all([
            FreshTokenContract.deployed(), WellTokenContract.deployed(),
            WhitelistCrowdsale.deployed()
        ])
        .then(res => {
            freshToken = res[0]; wellToken = res[1]; crowdsale = res[2];

            return Promise.all([
                freshToken.decimals(), wellToken.decimals()
            ])
        })
        .then(res => {
            unitFresh = 10 ** parseInt(res[0].toString());
            unitWell = 10 ** parseInt(res[1].toString());;

            return Promise.all( packages.map( pkg => {
                let tokenAddresses = [], tokenAmounts = [];

                if(pkg.tokens.well) {
                    tokenAddresses.push(wellToken.address);
                    tokenAmounts.push( (pkg.tokens.well * unitWell).toString());
                }

                if(pkg.tokens.fresh) {
                    tokenAddresses.push(freshToken.address);
                    tokenAmounts.push( (pkg.tokens.fresh * unitWell).toString());
                }

                return crowdsale.addPackage(pkg.name, pkg.price, tokenAddresses, tokenAmounts)
            }))
            .then(arr => {
                // Add packages for sale
                arr.forEach((res, i) => {
                    packages[i].id = res.logs[0].args.ID.toString();
                });

                // Add buyers whitelistedBuyers to whitelist
                return Promise.all(whitelistedBuyers.map(buyer => {
                    crowdsale.addToWhitelist(buyer);
                }));
            })
        });
    });

    packages.forEach((pkg, j) => {
        let tokenStr = Object.keys(pkg.tokens).map(t => t.toUpperCase()).join(' and ');

        it('User should have tokens ' + tokenStr + ' in their wallet', function() {
            const buyer = whitelistedBuyers[j];

            return crowdsale.buyTokens(buyer, pkg.id, {from: buyer, value: pkg.price })
            .then(res => {
                expect(res.logs).to.not.be.empty;
                expect(res.logs[0]).to.have.property('event', 'TokensPurchased');

                expect(res.logs[0].args.amount.toString()).to.equal((pkg.tokens.well * unitWell).toString());

                return wellToken.balanceOf(buyer)
                .then(res => {
                    let amt = (pkg.tokens.well) ? (pkg.tokens.well * unitWell).toString() : '0';
                    expect(res.toString()).to.equal(amt, 'Check $WELL balance');

                    return freshToken.balanceOf(buyer)
                }).then(res => {
                    let amt = (pkg.tokens.fresh) ? (pkg.tokens.fresh * unitFresh).toString() : '0';
                    expect(res.toString()).to.equal(amt, 'Check $FRESH balance');
                });
            });
        });
    });
});
