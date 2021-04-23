// const { assert } = require("console");
const chai = require('chai');
const { expect } = chai;
const { isMainThread } = require("worker_threads");

const TemplateNFTMintContract = artifacts.require('CollabNFT');

contract('Test CollabNFT deploy', function (accounts) {
    let name = 'TEST ART';
    let symbol = 'TART';
    let collabNFTAddress;
    let artist = accounts[0];
    let priceInEth = web3.utils.toWei('0.04', "ether");
    let artName1 = "The Well's Monalisa";
    let ArtID;
    let NewArtPrice;
    let collaborator1;

    it('Successfully deploys NFT', () => {
        return TemplateNFTMintContract.new(name, symbol, artist, priceInEth)
        .then(addr => {
            return collabNFT.totalNumberOfArtPresent()
            .then(numArtAdded => {
                expect(numArtAdded.toString()).to.be.equal('0');

                // get added art name by calling it by its array list position/index
                expect( collabNFT.ART(0)).to.throw;
            });
        })
    });

    describe('Empty Parameters', function() {
        it('Deploy with no art', function() {
            return TemplateNFTMintContract.new(name, symbol, artist, collaborators, null)
            .then(addr => {
                return collabNFT.totalNumberOfArtPresent()
                .then(numArtAdded => {
                    expect(numArtAdded.toString()).to.be.equal('0');

                    // get added art name by calling it by its array list position/index
                    expect( collabNFT.ART(0)).to.throw;
                });
            })
        });

        it('should get art name by ID', async () => {

            // art id is 1 since we've added only one artname which is he first and only art added 
            ArtID = 1;

            // get art name by the art id
            ArtNameAdded = await collabNFT.getArtAliasByID(ArtID);

            // assert that art name1 is the same as ArtNameAdded just gotten above
            expect(artName1, 'artname isnt added').to.equal(ArtNameAdded)
        })
    });

    describe('Change art price', async () => {
        it('Artist should be able to change art price', async () => {
            //initialiaze a new art price for which one nft token will sell 
            NewArtPrice = await web3.utils.toWei('0.08', "ether");

            // update new art price on smart contract by calling the ChangeArtPrice function
            await collabNFT.ChangeArtPrice(NewArtPrice, { from: accounts[0] });

            console.log(priceInEth, 'is the old price of the nft/art')
            console.log(NewArtPrice, 'is the new price of the nft/art')

            // check if price is updated in smart contract
            const newupdatedprice = await collabNFT.priceInEth();

            /// assert that new art price is not the same as the priceInEth(old price)
            expect(NewArtPrice, 'new art price and old price in eth must not be the same thing').to.not.equal(priceInEth);
            expect(newupdatedprice.toString(), 'new updated price is not the same as new art price').to.equal(NewArtPrice);
        })
    })

    describe('Manage Collaborators', async () => {
        it('add new collaborators by their address and state their cut from the sale', async () => {
            collaborator1 = accounts[8];
            const collaborator1Percentage = '10';

            await collabNFT.AddCollaboratorsAndTheirRewardPercentage(collaborator1, collaborator1Percentage, { from: accounts[0] });

            /// call the getCollaboratorByID  smart contract function to get the address of the newly added collaborator. Collaborator addresss is tracked by virtue of when it was added. If collaborator address added first, it is nmber 1 hence put 1 as argument into the function
            const addedaddress = await collabNFT.getCollaboratorByID(1);

            /// assert that newly added address the same as the collaborator 1
            expect(addedaddress, 'collaborator not added or collaborattor address and address in collaborator array not the same thing').to.equal(collaborator1);
        })

        it('update percentage reward for collaborator', async () => {
            const collaborator1Percentage = '10';
            const newcollaborator1Percentage = '20',
                    collaborator1 = accounts[8]

            await collabNFT.updatePercentageRewardForCollaborators(collaborator1, newcollaborator1Percentage, { from: accounts[0] });

            let newPercentage = await collabNFT.getCollaboratorCut(collaborator1);

            expect(newPercentage.toString(), 'percentage cut not updated').to.not.equal(collaborator1Percentage);
            expect(newPercentage.toString(), 'percentage cut is not updated').to.equal(newcollaborator1Percentage);
        })
    });

    describe('Receiving ETH, Minting nft, Sending minted NFT to eth sender ', async () => {
        it('should send nft token of specified art to the eth sender upon receipt of eth', async () => {
            const tokenURI = 'localhost: http://127.0.0.1:5500/'
            //call the ReceiveEthAndMint function in the smart contract
            await collabNFT.ReceiveEthAndMint(ArtID, tokenURI, NewArtPrice, { from: accounts[6], value: NewArtPrice });

            // check nft token balance of eth sender 
            const tokenbalOfEthSender = await collabNFT.balanceOf(accounts[6])
            const nftartowner = await collabNFT.ownerOf(ArtID);

            expect(nftartowner, ' address function calling is not the owner of token').to.equal(accounts[6]);
            expect(tokenbalOfEthSender.toNumber(), 'token bal of eth sender is not 1').to.equal(1);

            const artistETHBAL = web3.eth.getBalance( artist, function (err, result) {
                if (err) {
                    console.error('Error:', err)
                } else {
                    console.log(web3.utils.fromWei(result, "ether") + " ETH")
                }
            })

            const collaboratorEthBal = web3.eth.getBalance( collaborator1, function(err, result) {
                if (err) {
                  console.error('Error:', err)
                } else {
                  console.log(web3.utils.fromWei(result, "ether") + " ETH")
                }
            })
        })
    })
})
