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
            let tokenID = res.events.filter(log => {
                return log.event == 'MintNFT'
            })[0].args._tokenID;

            return theWellNFT.tokenCreators(tokenID)
        }).then(res => {
            expect(res).to.eql([ artist.address ]);
        })
    });

    it('Mints NFT with 1 collaborator', () => {
        let artist = accounts[5];
        const collaborator = accounts[2],
            collaboratorShare = 35;

        return theWellNFT.connect(artist).mint(65, [collaborator.address], [collaboratorShare], tokenUri, 30, 45, 25)
        .then(res => res.wait())
        .then(res => {
            let tokenID = res.events.filter(log => {
                return log.event == 'MintNFT'
            })[0].args._tokenID;

            return theWellNFT.tokenCreators(tokenID)
        }).then(res => {
            expect(res).to.have.members([ artist.address, collaborator.address ]);
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
            expect(res).to.have.members([
                artist.address,
                ...collaborators
            ]);
        })
    });

    it('Check collaborator shares', function() {
        let artist = accounts[9];
        let collaborators = [
            {address: accounts[3].address},
            {address: accounts[4].address},
            {address: accounts[5].address},
            {address: accounts[7].address}
        ];

        collaborators = collaborators.map((a, i) => {
            a.shares = (i + 1) + (i * 3)
            return a;
        });

        return theWellNFT.connect(artist).mint(65,
            collaborators.map(c =>c.address), collaborators.map(c =>c.shares),
            tokenUri, 30, 45, 25
        )
        .then(res => res.wait())
        .then(res => {
            let tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                       .args.tokenId.toString();

            return Promise.all(
                collaborators.map(collaborator => {
                    return theWellNFT.creatorShare(tokenID, collaborator.address)
                    .then(res => expect(res.toString()).to.equal(collaborator.shares.toString()));
                })
            );
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
    });
})
