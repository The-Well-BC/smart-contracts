const TheWellNFT = artifacts.require('TheWellNFT');

module.exports = function(deployer, network) {
// module.exports = function(deployer, network, accounts) {
    let baseURI = '';

    if(network == 'test') {
        baseURI = 'https://example.com/';
    } else if(network == 'development') {
        baseURI = 'http://localhost:8002/';
    } else if(network == 'ropsten') {
        baseURI = 'https://ipfs.fleek.co/';
    } else if(network == 'live') {
        baseURI = 'https://example.com/';
    }

    return deployer.deploy(TheWellNFT, 'The Well NFT', 'WELLNFT', baseURI)
}
