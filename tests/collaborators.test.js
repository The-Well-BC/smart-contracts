const chai = require('chai');
const { expect } = chai;

const { faker } = require('@faker-js/faker');

const deploy = require('./deploy');

describe('Mint NFT with Collaborators', function () {
    let accounts, baseURI, theWellNFT;

    before(async function() {
        ({accounts, baseURI, nft:theWellNFT } = await deploy());
    });

    it('Successfully mints NFT with no collaborators', () => {
        const tokenUri = faker.datatype.string();
        const metadataUri = faker.datatype.string();

        let artist = accounts[1];
        return theWellNFT.connect(artist).mint(100, [], [], tokenUri, metadataUri)
            .then(res => res.wait())
            .then(res => {
                let tokenID = res.events.filter(log => {
                    return log.event == 'Transfer'
                })[0].args.tokenId;

                return theWellNFT.tokenCreators(tokenID)
            }).then(res => {
                expect(res).to.eql([ artist.address ]);
            })
    });

    it('Mints NFT with 1 collaborator', () => {
        const tokenUri = faker.datatype.string();
        const metadataUri = faker.datatype.string();

        let artist = accounts[5];
        const collaborator = accounts[2],
            collaboratorShare = 35;

        return theWellNFT.connect(artist).mint(65, [collaborator.address], [collaboratorShare], tokenUri, metadataUri)
            .then(res => res.wait())
            .then(res => {
                let tokenID = res.events.filter(log => {
                    return log.event == 'Transfer'
                })[0].args.tokenId;

                return theWellNFT.tokenCreators(tokenID)
            }).then(res => {
                expect(res).to.have.members([ artist.address, collaborator.address ]);
            })
    });

    it('tokenCreators method should return artist and all collaborators', () => {
        const tokenUri = faker.datatype.string();
        const metadataUri = faker.datatype.string();

        let artist = accounts[9];
        let collaborators = [ accounts[3].address, accounts[4].address,
            accounts[5].address, accounts[7].address ];

        const collaboratorShares = collaborators.map((a, i) => (i + 1) + (i * 3));

        return theWellNFT.connect(artist).mint(65, collaborators, collaboratorShares, tokenUri, metadataUri)
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
        const tokenUri = faker.datatype.string();
        const metadataUri = faker.datatype.string();

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
            tokenUri, metadataUri
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
})
