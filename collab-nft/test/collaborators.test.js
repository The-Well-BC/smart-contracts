// const { assert } = require("console");
const chai = require('chai');
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const TheWellNFT = artifacts.require('TheWellNFT');

contract('Test: Setting Collaborators', function (accounts) {
    let artist = accounts[0];
    let collaborators = [accounts[3], accounts[4], accounts[5], accounts[6], accounts[7]];

    let theWellNFT;

    before(function() {
        return TheWellNFT.deployed()
        .then(res => {
            theWellNFT = res;
        });
    });

    it('Successfully mints NFT with no collaborators', () => {
        return theWellNFT.mint(100, [], [], {from:artist})
        .then(res => {
            expect(res.logs).to.satisfy(events => {
                return events.some(log => {
                    return log.event == 'PayeeAdded'
                        &&
                        log.args.account == artist
                        &&
                        log.args.shares == 100
                    ;
                });
            }, 'Expect a PayeeAdded event where Payee is the artist');
        })
    });

    it('Mints NFT with 1 collaborator', () => {
        const collaborator = collaborators[0],
            collaboratorShare = 35;

        return theWellNFT.mint(65, [collaborator], [collaboratorShare], {from:artist})
        .then(res => {
            expect(res.logs).to.satisfy(events => {
                let payeeEvents = events.filter(log => log.event == 'PayeeAdded');

                return payeeEvents.length == 2 &&
                    // Check artist event
                    payeeEvents[0].args.account == artist &&
                    payeeEvents[0].args.shares == 65
                                &&
                    // Check collaborator event
                    payeeEvents[1].args.account == collaborator &&
                    payeeEvents[1].args.shares == collaboratorShare 
                ;
            }, 'Expect one "PayeeAdded" event for the artist and the collaborator each');
        })
    });

    it('tokenCreators method should return artist and all collaborators', () => {
        const collaboratorShares = collaborators.map((a, i) => (i + 1) + (i * 3));

        return theWellNFT.mint(65, collaborators, collaboratorShares, {from:artist})
        .then(res => {
            tokenID = res.logs.filter(log => log.event == 'Transfer')[0]
                       .args.tokenId.toString();

            return theWellNFT.tokenCreators(tokenID)
        }).then(res => {
            expect(res).to.eql([
                artist,
                ...collaborators
            ]);
        })
    });
})
