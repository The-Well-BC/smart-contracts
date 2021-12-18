const chai = require('chai');
const { expect } = chai;

const faker = require('faker');

const nftDeploy = require('../scripts/nft');
const { ethers } = require('hardhat');

describe('Interfacing with older nft contract', function () {
    let accounts, tokenOwner;

    const baseURI = faker.internet.url() + '/';

    before(async() => {
        accounts = await ethers.getSigners();

        tokenOwner = accounts[9];
    });

    it('Mint nft should start token id from the tokenid set on creation', async function() {
        const startTokenID = faker.datatype.number({max: 10}).toString();

        const { nft } = await nftDeploy(baseURI, accounts[4].address, startTokenID);

        return nft.connect(tokenOwner).mint(65, [accounts[5].address], [35], faker.datatype.string(), 'Qm1metadata')
            .then(tx => tx.wait())
            .then(tx => {
                let tokenID = tx.events.filter(log => log.event == 'Transfer')[0].args.tokenId;
                tokenID = tokenID.toString();
                expect(tokenID).to.equal(startTokenID);
            });
    });

    it('Mint nft should increment token id by 1', async function() {
        const startTokenID = faker.datatype.number({max: 10});

        const { nft } = await nftDeploy(baseURI, accounts[4].address, startTokenID);

        return Promise.all(
            Array(10).fill(0).map((x, i) => {
                return nft.connect(tokenOwner).mint(65, [accounts[5].address], [35], faker.datatype.string(), 'Qm1metadata')
                    .then(tx => tx.wait())
                    .then(tx => {
                        let tokenID = tx.events.filter(log => log.event == 'Transfer')[0].args.tokenId;
                        tokenID = tokenID.toString();
                        expect(parseInt(tokenID)).to.equal( startTokenID + i );
                    });
            })
        ).then(() => {
        });
    });

    it('Calling tokenURI on new contract should return token data from old contract', async function() {
        const startTokenID = faker.datatype.number({min:1, max:10});
        const tokenID = faker.datatype.number({ min:1, max:startTokenID });

        const metadataHash = 'Qm' + faker.git.commitSha(), mediaHash = 'Qm' + faker.git.commitSha();

        const { nft:nft1 } = await nftDeploy(baseURI, null, 1);
        const { nft:nft2 } = await nftDeploy(baseURI, nft1.address, startTokenID + 1);

        return Promise.all(
            Array(startTokenID).fill(0).map((x, i) => {
                return (() => {
                    let hash1, hash2;
                    if(i == tokenID - 1)
                        hash1 = mediaHash, hash2 = metadataHash;
                    else
                        hash1 = 'Qm' + faker.git.commitSha(), hash2 = 'Qm' + faker.git.commitSha();

                    return nft1.connect(tokenOwner).mint(65, [accounts[5].address], [35], hash1, hash2)
                })();
            })
        )
            .then(() => nft2.connect(tokenOwner).mint(65, [accounts[5].address], [35], 'Qm' + faker.git.commitSha(),'Qm' + faker.git.commitSha()))
            .then(async() => expect( await nft2.tokenURI(tokenID) ).to.equal(baseURI + metadataHash))
            .then(async() => expect( await nft2.tokenMediaURI(tokenID) ).to.equal(baseURI + mediaHash))
            .then(() => expect( nft1.tokenMediaURI(105) ).to.be.revertedWith("ERC721URIStorage: URI query for nonexistent token"))
        /*
        */
    });
})
