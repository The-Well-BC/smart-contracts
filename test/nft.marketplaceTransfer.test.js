const chai = require('chai');
const { expect } = chai;
const faker = require('faker');

const deploy = require('./deploy');

describe('Test: transfer/approval of nft to non-allowed contracts', function() {
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
        return nft.connect(tokenOwner).mint(65, [accounts[5].address], [35], faker.datatype.string(), 'Qm1metadata')
            .then(tx => tx.wait())
            .then(tx => {
                tokenID = tx.events.filter(log => log.event == 'Transfer')[0].args.tokenId;
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
            })
    });

    it('Allow user call setApprovalForAll with operator = WELL marketplace contract', async function() {
        return nft.connect(tokenOwner).setApprovalForAll(marketplace.address, tokenID)
            .then(tx => tx.wait())
            .then(res => {
                expect(res.events).to.satisfy(logs => {
                    return logs.some(log => {
                        return log.event == 'ApprovalForAll'
                            && log.args.operator == marketplace.address;
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

    it('Allow user call setApprovalForAll on token with operator = approved marketplace contract', async function() {
        return Promise.all(approvedMarketplaceContracts.map( contract => {
            return nft.connect(tokenOwner).setApprovalForAll(contract.address, tokenID)
                .then(tx => tx.wait())
                .then(res => {
                    expect(res.events).to.satisfy(logs => {
                        return logs.some(log => {
                            return log.event == 'ApprovalForAll'
                                && log.args.operator == contract.address;
                        });
                    });
                });
        }));
    });

    it('Don\'t allow user "approve" token to be used by non-approved marketplace contract', async function() {
        return expect(
            nft.connect(tokenOwner).approve(disallowedContract.address, tokenID)
        ).to.be.reverted
            .then(() =>
                expect( disallowedContract.connect(tokenOwner).sellNFT(tokenOwner.address, disallowedContract.address, tokenID)).to.be.reverted
            );
    });

    it('Don\'t allow user call "setApprovalForAll" for non-approved marketplace contract', async function() {
        return expect(
            nft.connect(tokenOwner).setApprovalForAll(disallowedContract.address, tokenID)
        ).to.be.reverted
            .then(() =>
                expect( disallowedContract.connect(tokenOwner).sellNFT(tokenOwner.address, disallowedContract.address, tokenID)).to.be.reverted
        );
    });
});
