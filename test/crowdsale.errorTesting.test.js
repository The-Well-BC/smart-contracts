const chai = require('chai');
const { expect } = chai;

const deploy = require('./deploy');

let freshToken, wellToken, unitFresh, unitWell;
let CollectorCrowdsale, accounts;

describe('Crowdsale: Sell tokens', function() {
    before(async function() {
        let deployed = await deploy();

        accounts = deployed.accounts;

        const { crowdsale, fresh, well } = deployed;

        unitFresh  = 10 ** parseInt((await fresh.decimals()).toString());
        unitWell = 10 ** parseInt((await well.decimals()).toString());

        freshToken = fresh, wellToken = well,
            CollectorCrowdsale = crowdsale;
    });

    it('Failed buyTokens transaction should return paid ether to function caller');
});
