const chai = require('chai');

const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');


const truffleAssert = require('truffle-assertions');

const { expect } = chai;

const deploy = require('./deploy');

let unitFresh, unitWell, Well, Fresh,
    CollectorCrowdsale, accounts, tokenAmounts;

describe('Crowdsale: Test Whitelisting', function() {
    let packageIDs = [];
    let whitelistedBuyers, otherBuyers;

    const price = ethers.utils.parseEther('25');

    before(function() {
        return deploy()
        .then(deployed => {
            const { crowdsale, fresh, unitFresh, well, unitWell } = deployed;
            Well = well, Fresh = fresh;
            accounts = deployed.accounts;

            whitelistedBuyers = [ accounts[4], accounts[5], accounts[6], ];
            otherBuyers = [ accounts[3], accounts[7], accounts[8], ];

            CollectorCrowdsale = crowdsale;

            const packageName = 'First Package Tester blah blah';
            const tokenAddresses = [ fresh.address, well.address ];
            tokenAmounts = [ (5 * unitFresh).toString(), unitWell.toString() ]

            return crowdsale.addPackage(packageName, price, tokenAddresses, tokenAmounts)
            .then(res => res.wait())
            .then(res => {
                packageIDs.push(res.events[0].args.ID);
                return Promise.all(whitelistedBuyers.map(buyer => {
                    crowdsale.addToWhitelist(buyer.address);
                }));
            })
        });
    });

    it('Don\'t allow any purchases from buyers not on the whitelist', async function() {
        const buyer = accounts[3];

        expect(
            CollectorCrowdsale.connect(buyer).buyTokens(buyer.address, packageIDs[0], {value: price})
        ).to.be.revertedWith('Crowdsale: Address not allowed to buy token');
    });

    it('Revert if transaction value is not equal to package price', function() {
        const purchaseAmount = ethers.utils.parseEther('1');

        return whitelistedBuyers.map(buyer => {
            expect(
                CollectorCrowdsale.connect(buyer).buyTokens(buyer.address, packageIDs[0], {value: purchaseAmount})
            ).to.be.reverted;
        })
    });

    it('#dev #bad #falsepositives Process purchases from buyers on the whitelist', function() {
        return whitelistedBuyers.map(async buyerWallet => {
            const buyer = buyerWallet.address;

            let res = await CollectorCrowdsale.connect(buyerWallet).buyTokens(buyer, packageIDs[0], {value: price})

            let wbalance = await Well.balanceOf(buyer);
            let fbalance = await Fresh.balanceOf(buyer);

            expect(wbalance.toString()).to.equal(tokenAmounts[1]);
            expect(fbalance.toString()).to.equal(tokenAmounts[0]);

        })
    });
});
