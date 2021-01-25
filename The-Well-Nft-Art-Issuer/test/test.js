const { assert } = require("console");
const { isMainThread } = require("worker_threads");

const TemplateNFTMintContract = artifacts.require('WellNftArtIssuer');

contract ( 'WellNftArtIssuer', function(accounts) {
    let name =  'TEST ART';
    let symbol = 'TART';
    let wellnftartissuerAddress;
    let artist = accounts[0];
    let priceInEth = web3.utils.toWei('0.04', "ether");
    let artName1 = "The Well's Monalisa";
    let ArtID;
    let NewArtPrice;

    before ( async() =>{
        // deploy the smart contract in test environment 
        wellnftartissuer = await TemplateNFTMintContract.new(name, symbol, artist, priceInEth);
        // get smart contract address 
        wellnftartissuerAddress = wellnftartissuer.address;
    });

    describe ('add art to nft issuer smart contract', async() => {
        it ('should add a new art name to the smart contract list', async() => {
            // call addART function in smart contract to add new art to smart contract by its name 
            await wellnftartissuer.addART(artName1);

            // get total number of art names present, art that can be minted 
            const getNumeberOfArtsAdded = await wellnftartissuer.totalNumberOfArtPresent();

// assert that etNumeberOfArtsAdded is equal to 1 right now as we have only added one name 
            assert (getNumeberOfArtsAdded === 1)

            // get added art name by calling it by its array list position/index
            const AddedArtName = await wellnftartissuer.ART(0);


            // assert that added art name is present 
            assert(AddedArtName === artName1 );

        })
    })
    describe ('get art alias/name added to the smart contract by Art ID', async() => {
        it ('should get art name by ID', async() => {

            // art id is 1 since we've added only one artname which is he first and only art added 
            ArtID = 1;

            // get art name by the art id
            ArtNameAdded = await wellnftartissuer.getArtAliasByID(ArtID);

// assert that art name1 is the same as ArtNameAdded just gotten above
            assert ( artName1 === ArtNameAdded, 'artname isnt added');
        })
    })
    describe ('change art price', async() => {
        it ('artist should be able to change art price', async() => {
            //initialiaze a new art price for which one nft token will sell 
           NewArtPrice = await web3.utils.toWei('0.08', "ether");

           // update new art price on smart contract by calling the ChangeArtPrice function
           await wellnftartissuer.ChangeArtPrice(NewArtPrice, {from: accounts[0]});

           console.log(priceInEth, 'is the old price of the nft/art')
           console.log(NewArtPrice, 'is the new price of the nft/art')

           // check if price is updated in smart contract
           const newupdatedprice = await wellnftartissuer.priceInEth();

           /// assert that new art price is not the same as the priceInEth(old price)
           assert(NewArtPrice !== priceInEth, 'new art price and old price in eth must not be the same thing');
           assert(newupdatedprice.toString() === NewArtPrice, 'new updated price is not the same as new art price');
        })
    })
    describe ('receive eth, mint art nft token to the eth sender ', async() => {
        it ('should send nft token of specified art to the eth sender upon receipt of eth', async() => {


            const tokenURI = 'localhost: http://127.0.0.1:5500/'
            //call the ReceiveEthAndMint function in the smart contract
            await wellnftartissuer.ReceiveEthAndMint( ArtID, tokenURI, NewArtPrice, {from: accounts[1], value: NewArtPrice});
             
            // check nft token balance of eth sender 
            const tokenbalOfEthSender = await wellnftartissuer.balanceOf(accounts[1])
            const nftartowner = await wellnftartissuer.ownerOf(ArtID);

            assert( nftartowner === accounts[1], 'function calling adress is not the owner of token');
            assert(tokenbalOfEthSender.toNumber() === 1, 'token bal of eth sender is not 1');


              
        })
    })

    
})