const chai = require('chai');
const { expect } = chai;

const deploy = require('./deploy');

describe('NFT marketplaces', function() {
    let approvedMarketplaceContracts = [], disallowedContract, nft, marketplace,
        token, accounts, tokenOwner, buyer;

    before(async() => {
        const hh = require('hardhat');
        const AdminTesterArtifact = await hh.ethers.getContractFactory('AdminTester');

        disallowedContract = await AdminTesterArtifact.deploy();

        ({ nft, marketplace, accounts } = await deploy());

        approvedMarketplaceContracts.push(await AdminTesterArtifact.deploy());
        approvedMarketplaceContracts.push(await AdminTesterArtifact.deploy());
        approvedMarketplaceContracts.push(await AdminTesterArtifact.deploy());

        await Promise.all(
            approvedMarketplaceContracts.map(contract => nft.addApprovedMarketplace(contract.address))
        );

        tokenOwner = accounts[9];
        buyer = accounts[3];
    });

    it('Allow user "approve" token to be used by WELL marketplace contract', async function() {
        return nft.getApprovedMarketplaces()
            .then(res => {
                expect(res).to.have.members(
                    approvedMarketplaceContracts.map(c => c.address)
                );
            });
    });
});
