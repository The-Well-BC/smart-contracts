const chai = require('chai');
const { expect } = chai;

const {
  expectEvent,  // Assertions for emitted events
  expectRevert, // Assertions for transactions that should fail
} = require('@openzeppelin/test-helpers');

const deploy = require('./deploy');

describe('Test: Mint NFTs', function () {
    let name = "The Monalisa";

    let theWellNFT, accounts, artists, collaborators;

    before(async function() {
        let deployed = await deploy();
        accounts = deployed.accounts;

        theWellNFT = deployed.nft;

        // Array of artists. Each test should use a different artist so we have a clean slate
        artists = [accounts[0], accounts[1], accounts[2], accounts[7]];
        collaborators = [ accounts[3], accounts[4], accounts[5]].map(c => c.address);
    });

    it('Check default NFT URI', () => {
        const artistWallet = artists[0], artist = artists[0].address;
        let tokenID, tokenURI = 'https://boom.com/{tokenId}.json';

        return theWellNFT.connect(artistWallet).mint(65, [accounts[5].address], [35], tokenURI)
        .then(res => res.wait())
        .then(res => {
            tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                           .args.tokenId.toString();
            // Check token URI
            return theWellNFT.tokenURI(tokenID)
        }).then(uri => {
            expect(uri).to.equal(tokenURI);
        });
    });

    it('Set Token URI', () => {
        const artistWallet=artists[1], artist = artistWallet.address;
        let tokenID;

        return theWellNFT.connect(artistWallet).mint(65, [collaborators[1]], [35], 'Qmabcdefg.json')
        .then(res => res.wait())
        .then(res => {
            tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                           .args.tokenId.toString();

            // Check token URI
            return theWellNFT.tokenURI(tokenID)
        }).then(uri => {
            // expect(uri).to.equal('https://example.com/Qmabcdefg.json');
        });
    });

    it('Check artist NFT balance - No collaborators', async () => {
        const artistWallet=artists[2], artist = artistWallet.address;

        return theWellNFT.connect(artistWallet).mint(100, [], [], '')
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

        return theWellNFT.connect(artistWallet).mint(65, [collaborator], [collaboratorShare], 'asdf.json')
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
})
