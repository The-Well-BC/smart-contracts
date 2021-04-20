// const { assert } = require("console");
const chai = require('chai');
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const TemplateNFTMintContract = artifacts.require('CollabNFT');

contract.only('Test Collaborator functions', function (accounts) {
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

    describe('Setting Collaborators', function() {
        let collabNFT, contractAddress;
        before(function() {
            return TemplateNFTMintContract.new(name, symbol, artist, artistCut, [], [], [])
            .then(res => {
                collabNFT = res;
                contractAddress = collabNFT.address;
            });
        });

        it('Should not be able to set collaborator + artist cuts > 100', function() {
            let collaborators = [ a[1], a[2], a[3]];
            let collaboratorCuts = [ 20, 25, 30 ];  // Collaborator cuts + artist cuts = 125%.
            expect(collabNFT.setCollaborators([ a[1] ], [20])).to.throw;
        });

        it('Setting collaboratos should not fail if percentages add up', function() {
            expect(collabNFT.setCollaborators([accounts[1]], [20])).to.not.throw;
            expect( collabNFT.setCollaborators(
                [a[1], a[2]],
                [1, 2]
            )).to.not.throw;
        });

        it('Set collaborators of various lengths', function() {
            expect(collabNFT.setCollaborators([accounts[1]], [20])).to.not.throw;

            return collabNFT.setCollaborators([accounts[1]], [20])
            .then(() => {
                return collabNFT.getCollaborators()
                .then(res => {
                    let collaborators = res[0],
                    percentageCuts = res[1];
                    expect(collaborators[0]).to.equal(accounts[1]);

                    expect(percentageCuts[0].toString()).to.equal('20');

                    for(i = 1; i < collaborators.length; i++) {
                        expect(collaborators[i]).to.equal('0x0000000000000000000000000000000000000000');
                        expect(percentageCuts[i].toString()).to.equal('0');
                    }
                });
            })
        });

        it('Should set two collaborators', function() {
            // call addART function in smart contract to add new art to smart contract by its name 
            return collabNFT.setCollaborators(
                [a[1], a[2]],
                ['1', '44']
            )
            .then(() => {
                // get total number of art names present, art that can be minted 
                return collabNFT.getCollaborators()
                .then(res => {
                    console.log('Got Collaborators:', res);
                    let collaborators = res[0],
                    percentageCuts = res[1];

                    expect(collaborators[0]).to.equal(a[1]);
                    expect(percentageCuts[0].toString()).to.equal('1');

                    expect(collaborators[1]).to.equal(a[2]);
                    expect(percentageCuts[1].toString()).to.equal('44');

                    for(i = 2; i < collaborators.length; i++) {
                        expect(collaborators[i]).to.equal('0x0000000000000000000000000000000000000000');
                        expect(percentageCuts.toString()).to.equal('0');
                    }
                });
            })
        });
    });

    describe('Paying Collaborators and Creator', function() {
        let collabNFT, contractAddress;
        let collaborators = [a[1], a[2], a[3], a[4]],
            collaboratorCuts = [5, 25, 7, 8];
        before(function() {
            return TemplateNFTMintContract.new(name, symbol, artist, artistCut, collaborators, collaboratorCuts, [])
            .then(res => {
                collabNFT = res;
                contractAddress = collabNFT.address;
            });
        });

        it('Should pay collaborators', function() {
            const tokenURI = 'localhost: http://127.0.0.1:5500/'
            return collabNFT.receiveEthAndMint(12)
            .then(res => {
                const collaboratorEthBal = web3.eth.getBalance( a[1], function(err, result) {
                    if (err) {
                      console.error('Error:', err)
                    } else {
                      console.log(web3.utils.fromWei(result, "ether") + " ETH")
                    }
                });
            });
        });
    });
});
