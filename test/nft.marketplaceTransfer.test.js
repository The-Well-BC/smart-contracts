const chai = require('chai');
const { expect } = chai;

const deploy = require('./deploy');

describe('Test: Block transfer/approval of nft to non-allowed contracts', function() {
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

    beforeEach(async() => {
        return nft.connect(tokenOwner).mint(65, [accounts[5].address], [35], 'https://example.token.com/', 30, 45, 25)
        .then(tx => tx.wait())
        .then(tx => {
            tokenID = tx.events.filter(log => log.event == 'MintNFT')[0].args._tokenID;
            tokenID = tokenID.toString();
        });
    });

    it('Allow nft transfer to eoa address', function() {
        return nft.connect(tokenOwner).transferFrom(tokenOwner.address, buyer.address, tokenID)
            .then(tx => tx.wait())
            .then(res => {
                expect(res.events).to.satisfy(logs => {
                    return logs.some(log => {
                        return log.event == 'Transfer'
                    });
                });

                return expect(
                    nft.connect(buyer).ownerOf(tokenID)
                ).to.eventually.equal(buyer.address);
            });
    });

    it('Allow user "approve" token to be used by WELL marketplace contract', async function() {
        return nft.connect(tokenOwner).approve(marketplace.address, tokenID)
            .then(tx => tx.wait())
            .then(res => {
                expect(res.events).to.satisfy(logs => {
                    return logs.some(log => {
                        return log.event == 'Approval'
                            && log.args.approved == marketplace.address;
                    });
                });
            });
    });

    it('Allow user "approve" token to be used by approved marketplace contract', async function() {
        return Promise.all(approvedMarketplaceContracts.map( contract => {
            return nft.connect(tokenOwner).approve(contract.address, tokenID)
                .then(tx => tx.wait())
                .then(res => {
                    expect(res.events).to.satisfy(logs => {
                        return logs.some(log => {
                            return log.event == 'Approval'
                                && log.args.approved == contract.address;
                        });
                    });
                });
        }));
    });

    it('Don\'t allow user "approve" token to be used by non-approved marketplace contract', async function() {
        return expect(
            nft.connect(tokenOwner).approve(disallowedContract.address, tokenID)
        ).to.be.reverted;
    });
});
