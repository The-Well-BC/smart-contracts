// const { assert } = require("console");
const chai = require('chai');
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const deploy = require('./deploy');

describe('Test: Setting Collaborators', function () {
    let accounts, theWellNFT,
        tokenUri = 'http://example-tokens/s0m3Hash';

    before(async function() {
        let deployed = await deploy();
        accounts = deployed.accounts;

        theWellNFT = deployed.nft;
    });

    it('Successfully mints NFT with no collaborators', () => {

        let artist = accounts[1];
        return theWellNFT.connect(artist).mint(100, [], [], tokenUri, 30, 45, 25)
        .then(res => res.wait())
        .then(res => {
            expect(res.events).to.satisfy(events => {
                return events.some(log => {
                    return log.event == 'PayeeAdded'
                        &&
                        log.args.account == artist.address
                        &&
                        log.args.shares == 100
                    ;
                });
            }, 'Expect a PayeeAdded event where Payee is the artist');
        })
    });

    it('Mints NFT with 1 collaborator', () => {
        let artist = accounts[5];
        const collaborator = accounts[2],
            collaboratorShare = 35;

        return theWellNFT.connect(artist).mint(65, [collaborator.address], [collaboratorShare], tokenUri, 30, 45, 25)
        .then(res => res.wait())
        .then(res => {
            expect(res.events).to.satisfy(events => {
                let payeeEvents = events.filter(log => log.event == 'PayeeAdded');

                return payeeEvents.length == 2 &&
                    // Check artist event
                    payeeEvents[0].args.account == artist.address &&
                    payeeEvents[0].args.shares == 65
                                &&
                    // Check collaborator event
                    payeeEvents[1].args.account == collaborator.address &&
                    payeeEvents[1].args.shares == collaboratorShare 
                ;
            }, 'Expect one "PayeeAdded" event for the artist and the collaborator each');
        })
    });

    it('tokenCreators method should return artist and all collaborators', () => {
        let artist = accounts[9];
        let collaborators = [ accounts[3].address, accounts[4].address,
                            accounts[5].address, accounts[7].address ];

        const collaboratorShares = collaborators.map((a, i) => (i + 1) + (i * 3));

        return theWellNFT.connect(artist).mint(65, collaborators, collaboratorShares, tokenUri, 30, 45, 25)
        .then(res => res.wait())
        .then(res => {
            let tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                       .args.tokenId.toString();

            return theWellNFT.tokenCreators(tokenID)
        }).then(res => {
            expect(res).to.eql([
                artist.address,
                ...collaborators
            ]);
        })
    });

    describe('MintNFT event', function() {
        it('MintNFT Event should return only artist if no collaborators', () => {
            let artist = accounts[9];

            const collaborator = accounts[8],
                collaboratorShare = 35;

            return theWellNFT.connect(artist).mint(65, [], [], tokenUri, 30, 45, 25)
            .then(res => res.wait())
            .then(res => {
                expect(res.events).to.satisfy(events => {
                    let mintEvents = events.filter(log => log.event == 'MintNFT');
                    let mintEvent = mintEvents[0];

                    expect( mintEvent.args._creators ).
                        to.eql([artist.address]);

                    expect( mintEvent.args._contentHash ).to.equal(tokenUri);

                    return mintEvents.length == 1;
                }, 'Expect one "MintNFT" event that returns all collaborators');
            })
        });

        it('event should return array of collaborators and, with artist being the first one', () => {
            let artist = accounts[9];
            let collaborators = [ accounts[2].address, accounts[3].address, accounts[4].address,
                accounts[5].address, accounts[7].address ];

            const collaboratorShares = collaborators.map((a, i) => (i + 1) + (i * 3));
            console.log('collaborator shares:', collaboratorShares);

            return theWellNFT.connect(artist).mint(55, collaborators, collaboratorShares, tokenUri, 30, 45, 25)
            .then(res => res.wait())
            .then(res => {
                expect(res.events).to.satisfy(events => {
                    let mintEvent = events.filter(log => log.event == 'MintNFT');

                    expect(mintEvent[0].args._creators)
                        .to.eql([artist.address, ...collaborators]);

                    expect(mintEvent[0].args._creators)
                        .to.not.eql([...collaborators, artist.address]);

                    return mintEvent.length == 1
                }, 'Expect one "MintNFT" event that returns all collaborators');
            })
        });
    });
})
