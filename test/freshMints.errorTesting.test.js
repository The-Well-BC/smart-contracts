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

    it('Failed buyTokens transaction should return paid ether to function caller');
});
