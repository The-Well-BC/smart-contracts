// const { assert } = require("console");
const chai = require('chai');
chai.use(
    require('chai-as-promised')
);
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const ShopFrontContract = artifacts.require('NFTShopFront');

contract('Setting and viewing Collaborators', function (accounts) {
    /* If using ganache-cli, run with ganache-cli -a 14 */
    let name = 'TEST ART';
    let symbol = 'TART';
    let artist = accounts[0];
    let a = accounts;
    let artistCut = 55;

    describe('Fetching Collaborators', function() {
        let collabNFT, contractAddress;
        let collaborators = [a[1], a[2], a[3], a[4], a[5]],
            collaboratorCuts = [5, 20, 8, 7, 5];

        before(function() {
            return ShopFrontContract.new(artist, artistCut, collaborators, collaboratorCuts, 'https://boom.com/${id}')
            .then(res => {
                collabNFT = res;
                contractAddress = collabNFT.address;
            });
        });

        it('Fetches all collaborators', function() {
            return collabNFT.getCollaborators()
            .then(res => {
                console.log('Got collaborator teting', res);
                expect(res).to.have.lengthOf(collaborators.length + 1);
                expect(res[0]).to.equal(artist);

                return Promise.all(collaborators.map(account => {
                    return collabNFT.getCollaborator(account)
                }));
            }).then(res => {
                for(let i = 1; i < res[0].length; i++) {
                    let c = res[0][i];
                    let _rewards = res[1][i];
                    console.log('\n\nCollaborator:', c, '\nCollaborator Reward:', _rewards);

                    expect(c[0]).to.equal(collaborators[0]); expect(_rewards[0].toString()).to.equal(collaboratorCuts[0].toString())
                    expect(c[1]).to.equal(collaborators[1]); expect(_rewards[1].toString()).to.equal(collaboratorCuts[1].toString())
                    expect(c[2]).to.equal(collaborators[2]); expect(_rewards[2].toString()).to.equal(collaboratorCuts[2].toString())
                    expect(c[3]).to.equal(collaborators[3]); expect(_rewards[3].toString()).to.equal(collaboratorCuts[3].toString())
                    expect(c[4]).to.equal(collaborators[4]); expect(_rewards[4].toString()).to.equal(collaboratorCuts[4].toString())
                }
            });
        });
    });

    describe('Setting Collaborators during deploy', function() {
        it.skip('Fail deploy if collaborators\' cuts + artist cuts != 100', function() {
        // Not needed anymore
            const paramArr = [
                { collaborators: [accounts[1]], rewards: [20] },
                { collaborators: [a[1], a[2]], rewards: [1, 2] },
                { collaborators: [ a[1], a[2], a[3]], rewards: [ 20, 25, 30 ]}
            ];

            return Promise.all(paramArr.map(({ collaborators, rewards }) => {
                return expect(
                    ShopFrontContract.new(artist, artistCut, collaborators, rewards, 'https://oook.com/${id}')
                ).to.be.rejected;
            }));
        });

        it.skip('Setting more than 10 collaborators should fail', function() {
        // Not needed anymore
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
                    ShopFrontContract.new(artist, artistCut, collaborators, rewards, 'https://asdf.com/${id}')
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
                    ShopFrontContract.new(artist, artistCut, collaborators, rewards, 'https://asdf.com/${id}')
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
                return ShopFrontContract.new(artist, artistCut, args.collaborators, args.rewards, 'https://boom.com/${id}')
                .then(collabNFT => {
                    return collabNFT.getCollaborators()
                    .then(res => {
                        expect(res).to.have.lengthOf(args.collaborators.length + 1);
                        expect(res[0]).to.equal(artist);

                        return Promise.all(args.collaborators.map(account => {
                            console.log('Getting Collaborator details for addr:', account);
                            return collabNFT.getCollaborator(account)
                        }));
                    }).then(res => {
                        expect(res).to.have.lengthOf(args.collaborators.length);
                        console.log('All collaborators', res);
                        res.forEach((result, i) => {
                            let collaborator = result[0],
                            percentageCut = result[1];

                            console.log('\n\nSingle collaborator:', result);
                            console.log('Index:', i);
                            expect(collaborator).to.equal(args.collaborators[i]);
                            expect(percentageCut.toString()).to.equal(args.rewards[i].toString());
                        })
                    })
                })
            });
        });
    });
});
