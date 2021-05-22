const WhitelistCrowdsale = artifacts.require('CollectorCrowdsale');
const Well = artifacts.require('Well');
const Fresh = artifacts.require('Fresh');

module.exports = function(deployer) {
    // Deploy the tokens
    return Promise.all([
        deployer.deploy(Well),
        deployer.deploy(Fresh)
    ])
    // Deploy Crowdsale contract
    // TODO: Replace address
    .then(() => {
        return deployer.deploy( WhitelistCrowdsale,
            4, '0x750e13021FD1c43E617e09CC998Ef90Ea1b98DC4', Well.address, Fresh.address
        );
    })
    .then(() => Promise.all([ Well.deployed(), Fresh.deployed() ]))
    .then(res => {
        const [ well, fresh ] = res;

        return Promise.all([
            well.grantMinterRole(WhitelistCrowdsale.address),
            fresh.grantMinterRole(WhitelistCrowdsale.address)
        ]);
    });
}
