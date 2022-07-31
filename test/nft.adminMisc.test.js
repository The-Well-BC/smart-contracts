const chai = require('chai');
const { expect } = chai;
const { faker } = require('@faker-js/faker');

const deploy = require('./deploy');

describe('NFT admin functions', function() {
    let approvedMarketplaceContracts = [], nft, theWellNFT,
        accounts, nonAdmin;

    before(async() => {
        const hh = require('hardhat');
        const AdminTesterArtifact = await hh.ethers.getContractFactory('AdminTester');

        ({ nft, accounts } = await deploy());
        theWellNFT = nft;

        approvedMarketplaceContracts.push(await AdminTesterArtifact.deploy());
        approvedMarketplaceContracts.push(await AdminTesterArtifact.deploy());
        approvedMarketplaceContracts.push(await AdminTesterArtifact.deploy());

        await Promise.all(
            approvedMarketplaceContracts.map(contract => nft.addApprovedMarketplace(contract.address))
        );

        nonAdmin = accounts[4];
    });

    it('Non-admins should not be able to set token base URI', async function() {
        const baseURI = faker.internet.url();
        const metadataHash = 'Qm' + faker.git.commitSha();

        return expect( nft.connect(nonAdmin).setBaseURI(baseURI) ).to.be.revertedWith('is not Admin')
            .then(() => theWellNFT.connect(accounts[5]).mint(65, [accounts[5].address], [35], faker.git.commitSha(), metadataHash))
            .then(() => expect( theWellNFT.tokenURI(1)).to.eventually.not.contain(baseURI))
            .then(() => expect( theWellNFT.tokenMediaURI(1)).to.eventually.not.contain(baseURI))
    });

    it('Allow admin to set token base URI', async function() {
        const baseURI = faker.internet.url();
        const metadataHash = 'Qm' + faker.git.commitSha();
        const artistWallet = accounts[0];

        return nft.setBaseURI(baseURI)
            .then(() => theWellNFT.connect(artistWallet).mint(65, [accounts[5].address], [35], faker.git.commitSha(), metadataHash))
            .then(() => theWellNFT.tokenURI(1))
            .then(() => expect( theWellNFT.tokenURI(1)).to.eventually.match( new RegExp('^' + baseURI)))
            .then(() => expect( theWellNFT.tokenMediaURI(1)).to.eventually.match( new RegExp('^' + baseURI)))
    });
});
