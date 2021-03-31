const { assert } = require("console");
const { isMainThread } = require("worker_threads");

const TemplateNFTMintContract = artifacts.require('collabNFT');

contract('collabNFT', function (accounts) {
    let name = 'TEST ART';
    let symbol = 'TART';
    let collabNFTAddress;
    let artist = accounts[0];
    let priceInEth = web3.utils.toWei('0.04', "ether");
    let artName1 = "The Well's Monalisa";
    let ArtID;
    let NewArtPrice;
    let collaborator1;

    before(async () => {
        // deploy the smart contract in test environment 
        collabNFT = await TemplateNFTMintContract.new(name, symbol, artist, priceInEth);
        // get smart contract address 
        collabNFTAddress = collabNFT.address;
    });

    describe('add art to  smart contract', async () => {
        it('should add a new art name to the smart contract list', async () => {
            // call addART function in smart contract to add new art to smart contract by its name 
            await collabNFT.addART(artName1, '{placeholder for ipfs hash}');

            // get total number of art names present, art that can be minted 
            const getNumeberOfArtsAdded = await collabNFT.totalNumberOfArtPresent();

            // assert that etNumeberOfArtsAdded is equal to 1 right now as we have only added one name 
            assert(getNumeberOfArtsAdded === 1)

            // get added art name by calling it by its array list position/index
            const AddedArtName = await collabNFT.ART(0);


            // assert that added art name is present 
            assert(AddedArtName === artName1);

        })
    })
    describe('get art alias/name added to the smart contract by Art ID', async () => {
        it('should get art name by ID', async () => {

            // art id is 1 since we've added only one artname which is he first and only art added 
            ArtID = 1;

            // get art name by the art id
            ArtNameAdded = await collabNFT.getArtAliasByID(ArtID);

            // assert that art name1 is the same as ArtNameAdded just gotten above
            assert(artName1 === ArtNameAdded, 'artname isnt added');
        })
    })
    describe('change art price', async () => {
        it('artist should be able to change art price', async () => {
            //initialiaze a new art price for which one nft token will sell 
            NewArtPrice = await web3.utils.toWei('0.08', "ether");

            // update new art price on smart contract by calling the ChangeArtPrice function
            await collabNFT.ChangeArtPrice(NewArtPrice, { from: accounts[0] });

            console.log(priceInEth, 'is the old price of the nft/art')
            console.log(NewArtPrice, 'is the new price of the nft/art')

            // check if price is updated in smart contract
            const newupdatedprice = await collabNFT.priceInEth();

            /// assert that new art price is not the same as the priceInEth(old price)
            assert(NewArtPrice !== priceInEth, 'new art price and old price in eth must not be the same thing');
            assert(newupdatedprice.toString() === NewArtPrice, 'new updated price is not the same as new art price');
        })
    })

    describe('AddCollaboratorsAndTheirRewardPercentage', async () => {
        it('add new collaborators by their address and state their cut from the sale', async () => {

            collaborator1 = accounts[8];
            const collaborator1Percentage = '10';


            await collabNFT.AddCollaboratorsAndTheirRewardPercentage(collaborator1, collaborator1Percentage, { from: accounts[0] });

            /// call the getCollaboratorByID  smart contract function to get the address of the newly added collaborator. Collaborator addresss is tracked by virtue of when it was added. If collaborator address added first, it is nmber 1 hence put 1 as argument into the function
            const addedaddress = await collabNFT.getCollaboratorByID(1);


            /// assert that newly added address the same as the collaborator 1
            assert(addedaddress === collaborator1, 'collaborator not added or collaborattor address and address in collaborator array not the same thing');

        })
    })

    describe('updatePercentageRewardForCollaborators', async () => {
        it('update percentage reward for collaborator', async () => {

          
            const collaborator1Percentage = '10';
            const newcollaborator1Percentage = '20';
                collaborator1 = accounts[8]



            await collabNFT.updatePercentageRewardForCollaborators(collaborator1, newcollaborator1Percentage, { from: accounts[0] });

            let newPercentage = await collabNFT.getCollaboratorCut(collaborator1);

            assert(newPercentage.toString() !== collaborator1Percentage, 'percentage cut not updated');
            assert(newPercentage.toString() === newcollaborator1Percentage, 'percentage cut is not updated');


        })
    })



    describe('receive eth, mint art nft token to the eth sender ', async () => {
        it('should send nft token of specified art to the eth sender upon receipt of eth', async () => {


            const tokenURI = 'localhost: http://127.0.0.1:5500/'
            //call the ReceiveEthAndMint function in the smart contract
            await collabNFT.ReceiveEthAndMint(ArtID, tokenURI, NewArtPrice, { from: accounts[6], value: NewArtPrice });

            // check nft token balance of eth sender 
            const tokenbalOfEthSender = await collabNFT.balanceOf(accounts[6])
            const nftartowner = await collabNFT.ownerOf(ArtID);

            assert(nftartowner === accounts[6], ' address function calling is not the owner of token');
            assert(tokenbalOfEthSender.toNumber() === 1, 'token bal of eth sender is not 1');

            const artistETHBAL = web3.eth.getBalance( artist, function (err, result) {
                if (err) {
                    console.log(err)
                } else {
                    console.log(web3.utils.fromWei(result, "ether") + " ETH")
                }
            })

            const collaboratorEthBal = web3.eth.getBalance( collaborator1, function(err, result) {
                if (err) {
                  console.log(err)
                } else {
                  console.log(web3.utils.fromWei(result, "ether") + " ETH")
                }
            })



        })
    })


})