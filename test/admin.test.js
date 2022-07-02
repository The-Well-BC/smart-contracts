const chai = require('chai');
chai.use( require('chai-as-promised') );
const { expect } = chai;

const deploy = require('./deploy');
const { ethers } = require('hardhat');
let AdminTesterArtifact;

async function newContract() {
    const hh = require('hardhat');
    AdminTesterArtifact = await hh.ethers.getContractFactory('AdminTester');

    return AdminTesterArtifact.deploy();
}

describe('Admin', function () {
    // let contract,
    let deployer, accounts;

    before(async() => {
        const allAccounts = await ethers.getSigners();

        deployer = allAccounts[0];
        accounts = [
            allAccounts[1], allAccounts[2], allAccounts[3], allAccounts[4],
            allAccounts[5], allAccounts[6], allAccounts[7], allAccounts[8],
            allAccounts[9], allAccounts[10]
        ];
    });

    describe('Non-admins', function() {
        let contract;

        before(async() => contract = await newContract());

        it('Non-admin account should not be able to call admin functions', function() {
            return expect(
                contract.connect(accounts[0]).adminTestFn()
            ).to.be.reverted
        });

        it('Non-admin account should not be able to add new admin', function() {
            let newAdmin = accounts[1];

            return (
                expect( contract.connect(accounts[2]).setAdmin(newAdmin.address) ).to.be.reverted
            )
                .then(() => {
                    return expect(
                        contract.connect(newAdmin).adminTestFn()
                    ).to.be.reverted
                });
        });

        it('Non-admin account should not be able to add new super admin', function() {
            let newAdmin = accounts[3];

            return expect(
                contract.connect(accounts[4]).addSuperAdmin(newAdmin.address)
            ).to.be.reverted;
        });
    });

    describe('Contract deployer, aka single admin', function() {
        let contract;

        before(async() => contract = await newContract());

        it('Contract deployer should be able to call admin functions', function() {
            return contract.connect(deployer).adminTestFn()
                .then(result => {
                    expect(result).to.equal(true);
                });
        });

        it('Should not be able to remove only superadmin', function() {
            return expect(contract.removeSuperAdmin(deployer.address)).to.be.reverted;
        });

        it('Contract deployer is superAdmin', function() {
            // Contract deployer should be able to add an admin and a super admin
            let newAdmins = [accounts[1], accounts[2]];
            let newSuperAdmin = accounts[0];

            return contract.connect(deployer).setAdmin(newAdmins[0].address)
                .then(() => {
                    return contract.connect(newAdmins[0]).adminTestFn()
                        .then(res => expect(res).to.be.true);
                })
                .then(() => {
                    return contract.connect(deployer).addSuperAdmin(newSuperAdmin.address)
                        .then(tx => tx.wait())
                        .then(tx => {
                            expect(tx.events).to.satisfy(logs => {
                                return logs.some(log => {
                                    return log.event === 'NewSuperAdmin'
                                        && log.args.admin_ ===  newSuperAdmin.address;
                                });
                            });

                            return contract.connect(newSuperAdmin).setAdmin(newAdmins[1].address)
                        });
                });
        });
    });

    describe('Testing votes with 2 or more SuperAdmins', function() {
        // Test for odd and even number of superAdmins
        let scenarios,
            newAdmin, newSuperAdmin, removeAdmin, removeSuperAdmin, newSuperAdmins_, superAdmins_;

        beforeEach(async () => {
            scenarios = [
                // {superAdmins: [] },
                {superAdmins: [accounts[0]]}, // two superadmins
                {superAdmins: [accounts[0], accounts[1]]}, //three superadmins
                {superAdmins: [accounts[0], accounts[1], accounts[2]]}, // four superadmins
                {superAdmins: [accounts[0], accounts[1], accounts[2], accounts[3]]}, // 5 superadmins
            ];

            newAdmin = accounts[5];
            newSuperAdmin = accounts[6];
            removeAdmin = deployer;
            removeSuperAdmin = accounts[0];

            return Promise.all( scenarios.map((scenario, scenarioIndex) => {
                return newContract()
                    .then(c => {
                        scenario.contract = c;
                        newSuperAdmins_ = scenario.superAdmins;

                        return newSuperAdmins_.map((newSuperAdmin, i) => {
                            superAdmins_ = [deployer, ...newSuperAdmins_.slice(0, i)];

                            return Promise.all( superAdmins_.map( superAdmin => {
                                // Call all previous superadmins to add new superadmin
                                return scenario.contract.connect(superAdmin).addSuperAdmin(newSuperAdmin.address)
                                    .catch(e => {
                                        if(!e.message.includes('admin already exists'))
                                            console.error('\n****ERROR ADDING ADMIN****\n', e);
                                    });
                            }))
                        })
                            .reduce((promiseChain, task) => promiseChain.then(() => task), Promise.resolve([]))
                    })
            }).flat())
                .then(() => {
                    return Promise.all( scenarios.map((scenario) => {
                        scenario.superAdmins.push(deployer);
                        return Promise.all(scenario.superAdmins.map(superAdm => {
                            return scenario.contract.connect(superAdm).superAdminTestFn()
                                .then(res => expect(res).to.be.true);
                        }))
                    }));
                });
        });

        it('Should not be able to add existing superadmin', function() {
            const superAdmin = deployer;

            return scenarios.map((scenario, index) => {
                return (() => {
                    console.log('index:', index);
                    if(scenario.superAdmins.length < 5) {
                        const voter = scenario.superAdmins[0],
                            {contract} = scenario;

                        return expect(
                            contract.connect(voter).addSuperAdmin(superAdmin.address)
                        ).to.be.revertedWith('Superadmin already exists')
                            .then(res => {
                                console.log('done', res);
                                return expect(
                                    contract.connect(superAdmin).superAdminTestFn()
                                ).to.be.revertedWith('boom');
                            });
                    }
                })()
            }).reduce((promiseChain, currentTask) => {
            });
        });

        it('Superadmins should need votes to set the admin', function() {
            return Promise.all( scenarios.map(scenario => {
                let voter = scenario.superAdmins[0];

                if(scenario.superAdmins.length < 5) {
                    return scenario.contract.connect(voter).setAdmin(newAdmin.address)
                        .then(tx => tx.wait())
                        .then(tx => {
                            expect(tx.events).to.have.lengthOf(1);

                            expect(tx.events).to.satisfy(logs => {
                                return logs.some(log => {
                                    return log.event === 'VoteAdded'
                                        && log.args._voter ===  voter.address;
                                });
                            });

                            return expect(
                                scenario.contract.connect(newAdmin).adminTestFn()
                            ).to.be.reverted;
                        });
                }
            }))
        });

        it('Disallow multiple votes', function() {
            return Promise.all( scenarios.slice(0, scenarios.length - 1).map(scenario => {
                let voter = scenario.superAdmins[0];
                let { contract } = scenario;

                return Promise.all([
                    contract.connect(voter).removeSuperAdmin(removeAdmin.address),
                    contract.connect(voter).addSuperAdmin(newSuperAdmin.address),
                    contract.connect(voter).removeAdmin(),
                    contract.connect(voter).setAdmin(newAdmin.address)
                ])
                    .then(() => {
                        return expect( contract.connect(voter).removeSuperAdmin(removeAdmin.address) )
                            .to.be.reverted
                    }).then(() => {
                        return expect( contract.connect(voter).addSuperAdmin(newSuperAdmin.address) )
                            .to.be.reverted;
                    }).then(() => {
                        return expect( contract.connect(voter).setAdmin(newAdmin.address) )
                            .to.be.reverted;
                    }).then(() => {
                        return expect( contract.connect(voter).removeAdmin() )
                            .to.be.reverted;
                    })
            }));
        });

        it('More than half the superAdmins should be able to vote to remove a superadmin', function() {
            return Promise.all( scenarios.map(scenario => {
                const { superAdmins, contract } = scenario;

                let halfpoint = Math.ceil(superAdmins.length/2);
                if(superAdmins.length % 2 == 0) halfpoint++;

                let voters = superAdmins.slice(0, halfpoint), votes = 0;

                return contract.connect(removeAdmin).superAdminTestFn()
                    .then(res => {
                        expect(res).to.be.true

                        // recurring function here
                        function voteOp(voterArray, currentIndex) {
                            let voter = voterArray[currentIndex];

                            return contract.connect(voter).removeSuperAdmin(removeAdmin.address)
                            .then(tx => tx.wait())
                                .then(tx => {
                                    let voteEvent = tx.events.some(log => {
                                        return log.event === 'VoteAdded'
                                            && log.args._voter ===  voter.address;
                                    });

                                    if(voteEvent) votes++;

                                    expect(voteEvent).to.be.true;
                                })
                                .then(tx => {
                                    if(votes < halfpoint) {
                                        return contract.connect(removeAdmin).superAdminTestFn()
                                            .then(res => expect(res).to.be.true);
                                    }
                                    else
                                        return expect( contract.connect(removeAdmin).superAdminTestFn() ).to.be.reverted
                                })
                                .then(() => {
                                    if(currentIndex > 0) 
                                        return voteOp(voterArray, currentIndex - 1);
                                });
                        }

                        return voteOp(voters, voters.length - 1);
                    })
                    .then(() =>
                        expect( contract.connect(removeAdmin).superAdminTestFn() ).to.be.reverted
                    );
            }).flat())
        });

        it('Operations with less than half of superadmin votes should not be carried out', function() {
            return Promise.all( scenarios.map(scenario => {
                const { superAdmins, contract } = scenario;

                if(superAdmins.length < 5) {

                    let halfpoint = Math.floor(superAdmins.length/2);

                    let voters = superAdmins.slice(0, halfpoint), votes = 0;

                    return Promise.all([
                        expect(contract.connect(newAdmin).adminTestFn()).to.be.reverted,
                        expect(contract.connect(newSuperAdmin).superAdminTestFn()).to.be.reverted,
                        expect(contract.connect(removeAdmin).adminTestFn()).to.eventually.be.true,
                        expect(contract.connect(removeSuperAdmin).superAdminTestFn()).to.eventually.be.true
                    ])
                        .then(() => {
                            // recurring function here
                            function voteOp(voterArray, currentIndex) {
                                let voter = voterArray[currentIndex];

                                return Promise.all([
                                    contract.connect(voter).setAdmin(newAdmin.address),
                                    contract.connect(voter).addSuperAdmin(newSuperAdmin.address),
                                    contract.connect(voter).removeAdmin(),
                                    contract.connect(voter).removeSuperAdmin(removeSuperAdmin.address),
                                ])
                                    .then(txes => Promise.all(txes.map(tx => tx.wait())))
                                    .then(txes => {
                                        let voteEvent = txes.every(tx => {
                                            return tx.events.some(log => {
                                                return log.event === 'VoteAdded'
                                                    && log.args._voter ===  voter.address;
                                            });
                                        });

                                        expect(voteEvent).to.be.true;
                                    })
                                    .then(tx => {
                                        return Promise.all([
                                            expect(contract.connect(newAdmin).adminTestFn()).to.be.reverted,
                                            expect(contract.connect(newSuperAdmin).superAdminTestFn()).to.be.reverted,
                                            expect(contract.connect(removeAdmin).adminTestFn()).to.eventually.be.true,
                                            expect(contract.connect(removeSuperAdmin).superAdminTestFn()).to.eventually.be.true
                                        ])
                                    })
                                    .then(() => {
                                        if(currentIndex > 0) 
                                            return voteOp(voterArray, currentIndex - 1);
                                    });
                            }

                            return voteOp(voters, voters.length - 1);
                        })
                        .then(() => {
                            return Promise.all([
                                expect(contract.connect(newAdmin).adminTestFn()).to.be.reverted,
                                expect(contract.connect(newSuperAdmin).superAdminTestFn()).to.be.reverted,
                                expect(contract.connect(removeAdmin).adminTestFn()).to.eventually.be.true,
                                expect(contract.connect(removeSuperAdmin).superAdminTestFn()).to.eventually.be.true
                            ])
                        });
                }
            }).flat())
        });

        it('Operations with more than half of superadmin votes should be carried out', function() {
            return Promise.all( scenarios.map(scenario => {
                const { superAdmins, contract } = scenario;

                if(superAdmins.length < 5) {

                    let halfpoint = Math.floor(superAdmins.length/2);
                    halfpoint++;

                    let voters = superAdmins.slice(0, halfpoint), votes = 0;

                    return Promise.all([
                        expect(contract.connect(removeAdmin).adminTestFn()).to.eventually.be.true,
                        expect(contract.connect(newAdmin).adminTestFn()).to.be.reverted,
                        expect(contract.connect(newSuperAdmin).superAdminTestFn()).to.be.reverted,
                        expect(contract.connect(removeSuperAdmin).superAdminTestFn()).to.eventually.be.true
                    ])
                        .then(() => {
                            return Promise.all(voters.map(voter => {
                                return Promise.all([
                                    contract.connect(voter).removeSuperAdmin(removeSuperAdmin.address),
                                    contract.connect(voter).addSuperAdmin(newSuperAdmin.address),
                                    contract.connect(voter).removeAdmin(),
                                    contract.connect(voter).setAdmin(newAdmin.address),
                                ])
                                    .then(txes => Promise.all(txes.map(tx => tx.wait())))
                                    .then(txes => {
                                        let voteEvent = txes.every((tx,i) => {
                                            return tx.events.some(log => {
                                                return log.event === 'VoteAdded'
                                                    && log.args._voter ===  voter.address;
                                            });
                                        });

                                        let newSuperAdminEvent = txes.some((tx, i) => {
                                            return tx.events.some(log => {
                                                return log.event === 'NewSuperAdmin'
                                                    // && log.args.admin_ ===  newSuperAdmin.address;
                                            });
                                        });
                                        if(voteEvent) votes++;

                                        else {
                                            if(!((scenario.superAdmins.length == 2) && newSuperAdminEvent)) {
                                                expect(voteEvent, 'Each tx should have one vote event').to.be.true;
                                            }
                                        }
                                    });
                            }).flat())
                        })
                        .then(() => {
                            return Promise.all([
                                expect(contract.admin()).to.eventually.equal(newAdmin.address),
                                expect(contract.connect(newAdmin).adminTestFn()).to.eventually.be.true,
                                expect(contract.connect(newSuperAdmin).superAdminTestFn()).to.eventually.be.true,
                                expect(contract.connect(removeAdmin).adminTestFn(), 'remove admin privileges').to.be.reverted,
                                expect(contract._superAdminIndex(removeSuperAdmin.address)).to.eventually.equal(0),
                                expect(contract.connect(removeSuperAdmin).superAdminTestFn(), 'remove superadmin privileges').to.be.reverted
                            ])
                        });
                }
            }).flat())
        });
    });
});
