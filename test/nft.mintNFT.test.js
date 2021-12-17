const chai = require('chai');
const { expect } = chai;
const faker = require('faker');

const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const deploy = require('./deploy');

describe('Mint NFT', function () {
    let name = "The Monalisa";

    let theWellNFT, accounts, artists, collaborators;
    let baseURI = 'http://localhost:8002/ipfs/';

    before(async function() {
        ({ accounts, nft:theWellNFT, baseURI } = await deploy());

        // Array of artists. Each test should use a different artist so we have a clean slate
        artists = [accounts[0], accounts[1], accounts[2], accounts[7]];
        collaborators = [ accounts[3], accounts[4], accounts[5]].map(c => c.address);
    });

    it('Check NFT URI', () => {
        const artistWallet = artists[0], artist = artists[0].address;
        let tokenID, metadataURI = faker.datatype.string();

        return theWellNFT.connect(artistWallet).mint(65, [accounts[5].address], [35], 'asdkf', metadataURI)
        .then(res => res.wait())
        .then(res => {
            tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                           .args.tokenId.toString();
            // Check token URI
            return theWellNFT.tokenURI(tokenID)
        }).then(uri => {
            expect(uri).to.equal(baseURI + metadataURI);
        });
    });

    it('Check NFT metadata and media hash', () => {
        const artistWallet = artists[0], artist = artists[0].address;
        let tokenID, metadataHash = faker.datatype.string(), mediaHash = 'Qm' + faker.git.commitSha();

        return theWellNFT.connect(artistWallet).mint(65, [accounts[5].address], [35], mediaHash, metadataHash)
        .then(res => res.wait())
        .then(res => {
            tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                           .args.tokenId.toString();
            // Check token URI
            return theWellNFT.metadataHash(tokenID)
        }).then(uri => {
            expect(uri).to.equal(metadataHash);
        });
    });

    it('Check NFT media hash', () => {
        const artistWallet = artists[0], artist = artists[0].address;
        let tokenID, mediaHash = 'Qm' + faker.git.commitSha();

        return theWellNFT.connect(artistWallet).mint(65, [accounts[5].address], [35], mediaHash, faker.datatype.string())
        .then(res => res.wait())
        .then(res => {
            tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                           .args.tokenId.toString();
            // Check token URI
            return theWellNFT.mediaHash(tokenID)
        }).then(uri => {
            expect(uri).to.equal(mediaHash);
        });
    });

    it('tokenURI() method should return metadata uri', function() {
        const mediaUri = faker.datatype.string();
        const metadataUri = faker.datatype.string();

        let artist = accounts[9];
        let collaborators = [ accounts[3].address, accounts[4].address,
            accounts[5].address, accounts[7].address ];

        const collaboratorShares = collaborators.map((a, i) => (i + 1) + (i * 3));

        return theWellNFT.connect(artist).mint(65, collaborators, collaboratorShares, mediaUri, metadataUri)
            .then(res => res.wait())
            .then(res => {
                let tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                    .args.tokenId.toString();

                return theWellNFT.tokenURI(tokenID)
            }).then(res => 
                expect(res).to.have.equal(baseURI + metadataUri)
            )
    });

    it('tokenMediaURI() method should return token media uri', function() {
        const mediaUri = faker.datatype.string();
        const metadataUri = faker.datatype.string();

        let artist = accounts[9];
        let collaborators = [ accounts[3].address, accounts[4].address ];

        const collaboratorShares = collaborators.map((a, i) => (i + 1) + (i * 3));

        return theWellNFT.connect(artist).mint(65, collaborators, collaboratorShares, mediaUri, metadataUri)
            .then(res => res.wait())
            .then(res => {
                let tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                    .args.tokenId.toString();

                return theWellNFT.tokenMediaURI(tokenID)
            }).then(res => 
                expect(res).to.have.equal(baseURI + mediaUri)
            )
    });

    it('Check artist NFT balance - No collaborators', async () => {
        const artistWallet=artists[2], artist = artistWallet.address;

        return theWellNFT.connect(artistWallet).mint(100, [], [], faker.datatype.string(), faker.datatype.string())
        .then(tx => tx.wait())
        .then(tx => {
            expect(
                tx.events.some(e => e.event === 'Transfer')
            ).to.be.true;

            let transferEvent = tx.events.filter(e => e.event === 'Transfer');
            expect(transferEvent).to.have.lengthOf(1);
            transferEvent = transferEvent[0];

            expect(transferEvent).to.have.property('event', 'Transfer');
            expect(transferEvent.args.to).to.equal(artist);

            // Check artist's NFT balance
            return theWellNFT.balanceOf(artist)
            .then(bal => {
                expect(parseInt(bal.toString())).to.be.a('number');
            });
        });
    });

    it('Check artist NFT balance - One collaborators', () => {
        const artistWallet=artists[3], artist = artistWallet.address;

        const collaborator = accounts[5].address,
            collaboratorShare = 35;

        return theWellNFT.connect(artistWallet).mint(65, [collaborator], [collaboratorShare], 'asdf.json', faker.datatype.string())
        .then(res => res.wait())
        .then(res => {
            expect(res.events).to.satisfy(events => {
                return events.some(log => {
                    return log.event == 'Transfer'
                        &&
                        log.args.to == artist
                    ;
                });
            }, 'Expect a Transfer event to the artist');

            // Check artist NFT balance
            return theWellNFT.balanceOf(artist)
        }).then(bal => {
            expect(bal.toString()).to.equal('1');

            // Check collaborator NFT balance
        }).then(bal => {
            return theWellNFT.balanceOf(artist)
            expect(bal.toString(), 'Collaborator NFT balance should be zero')
                .to.equal('0');
        });
    });

    it('Transfer Event should return artist nd collaborators, tokenURI and metadataURI', () => {
        const mediaHash = faker.git.commitSha();
        const metadataUri = faker.datatype.string();

        let artist = accounts[9];

        const collaborator = accounts[8],
            collaboratorShare = 35;

        return theWellNFT.connect(artist).mint(65, [collaborator.address], [collaboratorShare], mediaHash, metadataUri)
            .then(res => res.wait())
            .then(res => {
                let mintEvents = res.events.filter(log => log.event == 'Transfer');
                expect(res.events).to.have.lengthOf(1);

                let mintEvent = mintEvents[0];

                expect( mintEvent.args.from ).
                    to.equal('0x0000000000000000000000000000000000000000');

                expect(mintEvent.args.to).to.equal(artist.address);
            });
    })
})
