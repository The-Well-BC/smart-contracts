const chai = require('chai');
const { expect } = chai;

const { BN } = require('@openzeppelin/test-helpers');

let fresh, well, unitFresh, unitWell;

const deploy = require('./deploy');

describe('Crowdsale: Buy tokens', function() {
    let CrowdsaleContract;
    // 1 $WELL = 25 ETH
    let packages = [{
        id: null, tokens: { well: 2 },
        name: 'Single Token Package', price: ethers.utils.parseEther('5')
    }, {
        id: null, tokens: { well: 10, fresh: 5 },
        name: 'Multi token package', price: ethers.utils.parseEther('25')
    }];

    let packageIDs = [];
    const price = ethers.utils.parseEther('25');

    let whitelistedBuyers, otherBuyers;

    before(async function() {
        const deployed = await deploy();
        const { crowdsale, fresh, well } = deployed;

        unitWell = deployed.unitWell;
        unitFresh = deployed.unitFresh;

        accounts = await ethers.getSigners();

        whitelistedBuyers = [
            accounts[4], accounts[5], accounts[6], accounts[7],
        ];
        otherBuyers = [ accounts[3], accounts[8], accounts[9], ];

        freshToken = fresh; wellToken = well; CollectorCrowdsale = crowdsale;

        return Promise.all( packages.map( pkg => {
            let tokenAddresses = [], tokenAmounts = [];

            if(pkg.tokens.well) {
                tokenAddresses.push(well.address);
                tokenAmounts.push( (pkg.tokens.well * unitWell).toString());
            }

            if(pkg.tokens.fresh) {
                tokenAddresses.push(fresh.address);
                tokenAmounts.push( (pkg.tokens.fresh * unitWell).toString());
            }

            return crowdsale.addPackage(pkg.name, pkg.price, tokenAddresses, tokenAmounts)
        }))
        .then(arr => Promise.all( arr.map(tx => tx.wait()) ))
        .then(arr => {
            // Add packages for sale
            arr.forEach((res, i) => {
                packages[i].id = res.events[0].args.ID.toString();
            });

            // Add buyers whitelistedBuyers to whitelist
            return Promise.all(whitelistedBuyers.map(buyer => {
                crowdsale.addToWhitelist(buyer.address);
            }));
            console.log('Packages:', packages);
        })
    });

    packages.forEach((pkg, j) => {
        let tokenStr = Object.keys(pkg.tokens).map(t => t.toUpperCase()).join(' and ');

        it('User should have tokens ' + tokenStr + ' in their wallet', function() {
            const buyerWallet = whitelistedBuyers[j];
            const buyer = buyerWallet.address;

            return CollectorCrowdsale.connect(buyerWallet).buyTokens(buyer, pkg.id, {value: pkg.price })
            .then(res => {
                expect(res).to.emit(CollectorCrowdsale, 'TokensPurchased').withArgs(
                    buyer, buyer,
                    new BN((pkg.tokens.well * unitWell).toString()),
                    new BN((pkg.tokens.fresh * unitFresh).toString())
                );

                return wellToken.balanceOf(buyer)
            }).then(res => {
                res = res.toString();
                let amt = (pkg.tokens.well) ? new BN((pkg.tokens.well * unitWell).toString()) : new BN('0');
                expect(res).to.be.bignumber.equal(amt, 'Check $WELL balance');

                return freshToken.balanceOf(buyer)
            }).then(res => {
                res = res.toString();

                let amt = (pkg.tokens.fresh) ? new BN((pkg.tokens.fresh * unitFresh).toString()) : new BN('0');
                expect(res).to.be.bignumber.equal(amt, 'Check $FRESH balance');
            });
        });
    });
});
