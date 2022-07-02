const chai = require('chai');
const { expect } = chai;
const { ethers } = require('hardhat');

let freshToken, wellToken, unitFresh, unitWell,
    FreshTokenContract, WellTokenContract,
    CollectorCrowdsale;

describe('Crowdsale: Add packages', function() {
    let crowdsale, accounts;
    // 1 $WELL = 25 ETH

    before(async() => {
        accounts = await ethers.getSigners();

        const deployParameters = [[], [], [accounts[1].address]];
        return Promise.all([
            WellTokenContract = await ethers.getContractFactory('Well'),
            FreshTokenContract = await ethers.getContractFactory('Fresh'),
            CollectorCrowdsale = await ethers.getContractFactory('CollectorCrowdsale')
        ])
        .then(res => Promise.all( res.map((c,i) => c.deploy(...deployParameters[i]))))
        .then(res => Promise.all( res.map(c => c.deployed())))
        .then(res => {
            freshToken = res[0]; wellToken = res[1];
            crowdsale = res[2];

            return Promise.all([
                freshToken.decimals(), wellToken.decimals()
            ])
        })
        .then(res => {
            unitFresh = 10 ** parseInt(res[0].toString());
            unitWell = 10 ** parseInt(res[1].toString());
        });
    });

    it('Add single package to crowdsale contract', function() {
        const price = ethers.utils.parseEther('25');
        const tokenAddresses = [ freshToken.address, wellToken.address ];
        const tokenAmounts = [ (5 * unitFresh).toString(), unitWell.toString() ]
        const packageName = 'First Package Tester blah blah';

        return crowdsale.addPackage(packageName, price, tokenAddresses, tokenAmounts)
        .then(res => res.wait())
        .then(res => {
            let events = res.events;
            expect(events[0]).to.have.property('event', 'NewPackage');

            const packageID = events[0].args.ID
            expect(events[0].args).to.have.property('name_', packageName);

            return crowdsale.package(packageID);
        })
        .then(res => {
            expect(res).to.include.keys('name_', 'tokens_', 'tokenAmounts_');
            expect(res.tokens_).to.eql(tokenAddresses);
            expect(res.tokenAmounts_).to.satisfy(arr => {
                return arr.every((amt, i) => {
                    expect(amt.toString()).to.equal(tokenAmounts[i]);
                    return true;
                });
            });
        });
    });

    it('Add multiple packages to crowdsale contract', function() {
        const price = ethers.utils.parseEther('5');
        const tokenAddresses = [ freshToken.address, wellToken.address ];
        const packageName = ['Level 1 Collector', 'Level 2 Collector', 'Level 3 Collector'];

        return Promise.all( packageName.map((name, i) => {
            return crowdsale.addPackage(name,
                ((i + 1) * parseInt(price)).toString(),
                tokenAddresses,
                [((5 ** i) * unitFresh).toString(), ((i + 1) * unitWell).toString()]
            )
        }))
        .then(res => Promise.all( res.map(tx => tx.wait())))
        .then(res => {
            return Promise.all(res.map((tx, i) => {
                expect(tx.events[0]).to.have.property('event', 'NewPackage');

                expect(tx.events[0].args).to.have.property('name_', packageName[i]);

                const packageID = tx.events[0].args.ID
                return crowdsale.package(packageID);
            }));
        })
        .then(arr => {
            arr.every((res, i) => {
                expect(res).to.include.keys('name_', 'tokens_', 'tokenAmounts_');
                expect(res.tokens_).to.eql(tokenAddresses);

                expect(res.tokenAmounts_).to.satisfy(tokenAmts => {
                    expect(tokenAmts[0].toString()).to.equal(
                        ((5 ** i) * unitFresh).toString()
                    );

                    expect(tokenAmts[1].toString()).to.equal(
                        ((i + 1) * unitWell).toString()
                    );

                    return true;
                });

                return true;
            });
        });
    });
});
