const chai = require('chai');
const { expect } = chai;

const deploy = require('./deploy');
let saleContract, theWellNFT, marketplace, paymentSplitter, well;
let tokenID, tokenPrice = '30000000';

describe.skip('Test: NFT bids', function() {
    let accounts,
        artist, collaborators, payments;

    const creatorsRoyalties =  50,
        artistPercentage = 65,
        collaboratorPercentages = [20, 10, 5];

    // Deploy contracts and mint NFT in before()
    before(async function() {
        let deployed = await deploy();
        accounts = deployed.accounts;

        saleContract = deployed.sale;
        theWellNFT = deployed.nft;
        marketplace = deployed.marketplace;
        well = deployed.well;
        payments = deployed.paymentSplitter;
    });

    describe('Creator/Collaborator Royalties', function() {
        before(async function() {
            // Array of artists. Each test should use a different artist so we have a clean slate
            artist = accounts[5];
            collaborators = [ accounts[2], accounts[3], accounts[4]];

            return theWellNFT.connect(artist).mint(
                artistPercentage,
                collaborators.map(c => c.address),
                collaboratorPercentages,
                15, creatorsRoyalties, 35,
                'Qmblah123abc',
                '1metadata.json'
            )
                .then(res => res.wait())
                .then(res => {
                    tokenID = res.events.filter(log => log.event == 'Transfer')[0]
                        .args.tokenId.toString();

                    return saleContract.connect(artist).setPrice(tokenID, tokenPrice);
                }).then(() => {
                    return theWellNFT.connect(artist).approve(saleContract.address, tokenID);
                }).then(() => {
                    let buyer = accounts[1];

                    let bid = {
                        amount:tokenPrice,
                        currency:well.address,
                        bidder:buyer.address,
                        recipient:buyer.address,
                        sellOnShare: 5
                    };
                    let bid2 = (
                        tokenPrice,
                        well.address, buyer.address,
                        buyer.address,
                        5
                    );

                    return marketplace.connect(buyer)
                        .createBid(tokenID, bid, buyer.address)
                        .then(res => res.wait())
                });
        });
        it('Withdraw artist shares', function() {
            const artistShares = tokenPrice * (creatorsRoyalties/100) * (artistPercentage/100);

            return payments.connect(artist).release(tokenID, artist.address)
                .then(res => res.wait())
                .then(res => {
                    console.log('Total artist shares', res);
                    expect(res).to.equal(artistShares);
                });
        });
        it('Check collaborators\' shares', function() {
            const collaboratorShares = collaboratorPercentages.map(percent =>
                tokenPrice * (creatorsRoyalties/100) * (percent/100)
            );

            return Promise.all(
                collaborators.map(co => 
                    payments.connect(co).release(tokenID, co.address)
                )
            )
                .then(resArr => Promise.all(resArr.map(res => res.wait())))
                .then(res => {
                    console.log('Total collaborator shares', res);
                    expect(res.map(i => i.toString())).to.equal(collaboratorShares);
                });
        });
    });
});
