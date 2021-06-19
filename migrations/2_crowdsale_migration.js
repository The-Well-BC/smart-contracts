const WhitelistCrowdsale = artifacts.require('CollectorCrowdsale');
const Well = artifacts.require('Well');
const Fresh = artifacts.require('Fresh');

module.exports = function(deployer, network, accounts) {
    let contractsOwner, tokenSaleWallet, tokenUnitsPerWei;
    
    if(network == 'test' || network == 'development') {
        contractsOwner = accounts[0];
        tokenSaleWallet = accounts[1];
    } else if(network == 'ropsten') {
        contractsOwner = process.env.contractOwner;
        tokenSaleWallet = process.env.tokenSaleWallet;
    } else if(network == 'live') {
        contractsOwner = process.env.contractOwner;
        tokenSaleWallet = process.env.tokenSaleWallet;
    }


    // Deploy the tokens
    return Promise.all([
        deployer.deploy(Well, { from: contractsOwner }),
        deployer.deploy(Fresh, { from: contractsOwner })
    ])

    // Deploy and setup Crowdsale contract
    .then(() => {
        return deployer.deploy( WhitelistCrowdsale,
            tokenSaleWallet,
            { from: contractsOwner });
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
