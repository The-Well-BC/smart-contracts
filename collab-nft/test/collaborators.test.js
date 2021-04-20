// const { assert } = require("console");
const chai = require('chai');
chai.use(
    require('chai-as-promised')
);
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const TemplateNFTMintContract = artifacts.require('CollabNFT');

contract.only('Test Collaborator functions', function (accounts) {
    /* If using ganache-cli, run with ganache-cli -a 14 */
    let name = 'TEST ART';
    let symbol = 'TART';
    let artist = accounts[0];
    let a = accounts;
    let artistCut = 55;
    let priceInEth = web3.utils.toWei('0.04', "ether");
    let artName1 = "The Well's Monalisa";
    let ArtID;
    let NewArtPrice;
    let collaborator1;

    describe('Fetching Collaborators', function() {
        let collabNFT, contractAddress;
        let collaborators = [a[1], a[2], a[3], a[4], a[5]],
            collaboratorCuts = [5, 20, 8, 7, 5];

        before(function() {
            return TemplateNFTMintContract.new(name, symbol, artist, artistCut, collaborators, collaboratorCuts, [])
            .then(res => {
                collabNFT = res;
                contractAddress = collabNFT.address;
            });
        });

        it('Fetches all collaborators', function() {
            return collabNFT.getCollaborators()
            .then(res => {
                let c = res['0'], _rewards = res['1'];

                for(i = 5; i < c.length; i++) {
                    expect(c[i]).to.equal('0x0000000000000000000000000000000000000000', 'collaborators from index 4 till end should not be set');
                    expect(_rewards[i].toString()).to.equal('0', 'collaborators from index 4 till end should not be set');
                }
                expect(c[0]).to.equal(collaborators[0]); expect(_rewards[0].toString()).to.equal(collaboratorCuts[0].toString())
                expect(c[1]).to.equal(collaborators[1]); expect(_rewards[1].toString()).to.equal(collaboratorCuts[1].toString())
                expect(c[2]).to.equal(collaborators[2]); expect(_rewards[2].toString()).to.equal(collaboratorCuts[2].toString())
                expect(c[3]).to.equal(collaborators[3]); expect(_rewards[3].toString()).to.equal(collaboratorCuts[3].toString())
                expect(c[4]).to.equal(collaborators[4]); expect(_rewards[4].toString()).to.equal(collaboratorCuts[4].toString())
            });
        });
    });

    describe('Setting Collaborators during deploy', function() {
        it('Fail deploy if collaborators\' cuts + artist cuts != 100', function() {
            const paramArr = [
                { collaborators: [accounts[1]], rewards: [20] },
                { collaborators: [a[1], a[2]], rewards: [1, 2] },
                { collaborators: [ a[1], a[2], a[3]], rewards: [ 20, 25, 30 ]}
            ];

            return Promise.all(paramArr.map(({ collaborators, rewards }) => {
                return expect(
                    TemplateNFTMintContract.new(name, symbol, artist, artistCut, collaborators, rewards, [])
                ).to.be.rejected;
            }));
        });

        it('Setting more than 10 collaborators should fail', function() {
            const paramArr = [{
                collaborators: [a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11]],
                rewards:[3, 4, 5, 4, 6, 4, 4, 4, 4, 6, 1]
              }, {
                collaborators: [a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12]],
                rewards:[3, 4, 5, 4, 6, 1, 4, 4, 4, 6, 1, 3]
              }, {
                collaborators: [a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10], a[11], a[12], a[13]],
                rewards:[3, 4, 3, 4, 6, 1, 4, 4, 4, 6, 1, 3, 2]
            }];

            return Promise.all(paramArr.map(({ collaborators, rewards }) => {
                return expect(
                    TemplateNFTMintContract.new(name, symbol, artist, artistCut, collaborators, rewards, [])
                ).to.eventually.be.rejected;
            }));
        });

        it('Successful deploy if collaborator + artist percentages add up to 100', function() {
            const paramArr = [
                { collaborators: [accounts[1]], rewards: [45] },
                { collaborators:[ a[1],a[2] ], rewards: [1, 44] },
                { collaborators:[ a[1],a[2] ], rewards: [21, 24] }
            ];

            return Promise.all(paramArr.map(({ collaborators, rewards }) => {
                return expect(
                    TemplateNFTMintContract.new(name, symbol, artist, artistCut, collaborators, rewards, [])
                ).to.eventually.to.be.fulfilled;
            }));
        });

        const tests = [
            // ten collaborators
            { collaborators:[a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9], a[10]],
                rewards:[3, 4, 5, 4, 6, 4, 4, 4, 4, 7] },
            // nine collaborators
            { collaborators:[a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8], a[9]],
                rewards:[6, 4, 3, 5, 5, 2, 7, 4, 9] },
            // 2 collaborators
            { collaborators:[a[2], a[4]], rewards:[36, 9] },
            // 1 collaborators
            { collaborators:[a[3]], rewards:[45] },
        ];

        tests.forEach((args) => {
            it(`Set ${ args.collaborators.length } collaborators`, function() {
                return TemplateNFTMintContract.new(name, symbol, artist, artistCut, args.collaborators, args.rewards, [])
                .then(collabNFT => {
                    return collabNFT.getCollaborators()
                    .then(res => {
                        let collaborators = res[0],
                        percentageCuts = res[1];

                        for(i = 0; i < collaborators.length; i++) {
                            if(i < args.collaborators.length) {
                                expect(collaborators[i]).to.equal(args.collaborators[i]);
                                expect(percentageCuts[i].toString()).to.equal(args.rewards[i].toString());
                            } else {
                                expect(collaborators[i]).to.equal('0x0000000000000000000000000000000000000000');
                                expect(percentageCuts[i].toString()).to.equal('0');
                            }
                        }
                    });
                })
            });
        });
    });

    describe('Paying Collaborators and Creator', function() {
        let collabNFT, contractAddress;
        let collaborators = [a[1], a[2], a[3], a[4]],
            collaboratorCuts = [5, 25, 5, 10];
        before(function() {
            return TemplateNFTMintContract.new(name, symbol, artist, artistCut, collaborators, collaboratorCuts, [])
            .then(res => {
                collabNFT = res;
                contractAddress = collabNFT.address;
            });
        });

        it('Should add to collaborators\' balance', function() {
            const tokenURI = 'localhost: http://127.0.0.1:5500/'
            return collabNFT.receiveEthAndMint(12)
            .then(res => {
                const collaboratorEthBal = web3.eth.getBalance(collaborators[0], function(err, result) {
                    if (err) {
                        console.error('Error:', err)
                    } else {
                        const bal = web3.utils.fromWei(result, "ether");
                        console.log(bal + " ETH")

                        expect(bal)
                    }
                });
            });
        });
    });
});
