// const { assert } = require("console");
const chai = require('chai');
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const TheWellNFT = artifacts.require('TheWellNFT');

contract('Test: Mint NFTs', function (accounts) {
    let name = "The Monalisa";
    // Array of artists. Each test should use a different artist so we have a clean slate
    let artists = [accounts[0], accounts[1], accounts[2]];

    let theWellNFT;

    before(function() {
        return TheWellNFT.deployed()
        .then(res => {
            theWellNFT = res;
        });
    });

    it('Check default NFT URI', () => {
        const artist = artists[0];
        let tokenID;

        return theWellNFT.mint(65, [accounts[5]], [35], {from:artist})
        .then(res => {
            tokenID = res.logs.filter(log => log.event == 'Transfer')[0]
                           .args.tokenId.toString();
            // Check token URI
            return theWellNFT.tokenURI(tokenID)
        }).then(uri => {
            expect(uri).to.equal('https://example.com/1');
            expect(uri).to.contain('1');
        });
    });

    it('Set Token URI', () => {
        const artist = artists[0];
        let tokenID;

        return theWellNFT.mint(65, [accounts[5]], [35], 'Qmabcdefg.json', {from:artist})
        .then(res => {
            tokenID = res.logs.filter(log => log.event == 'Transfer')[0]
                           .args.tokenId.toString();

            // Check token URI
            return theWellNFT.tokenURI(tokenID)
        }).then(uri => {
            expect(uri).to.equal('https://example.com/Qmabcdefg.json');
        });
    });

    it('Check artist NFT balance - No collaborators', () => {
        const artist = artists[0];

        return theWellNFT.mint(100, [], [], {from:artist})
        .then(res => {
            expect(res.logs).to.satisfy(events => {
                return events.some(log => {
                    return log.event == 'Transfer'
                        &&
                        log.args.to == artist
                    ;
                });
            }, 'Expect a Transfer event to the artist');

            // Check artist's NFT balance

            return theWellNFT.balanceOf(artist)
        }).then(bal => {
            expect(parseInt(bal.toString())).to.be.a('number');
        });
    });

    it('Check artist NFT balance - One collaborators', () => {
        const artist = artists[1];

        const collaborator = accounts[5],
            collaboratorShare = 35;

        return theWellNFT.mint(65, [collaborator], [collaboratorShare], 'asdf.json', {from:artist})
        .then(res => {
            expect(res.logs).to.satisfy(events => {
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
