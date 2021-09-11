const chai = require('chai');
const { expect } = chai;

const deploy = require('./deploy');
let AdminTesterArtifact;

async function newContract() {
    const hh = require('hardhat');
    AdminTesterArtifact = await hh.ethers.getContractFactory('AdminTester');

    return AdminTesterArtifact.deploy();
}

describe('Test: Admin Contract', function () {
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
                expect( contract.connect(accounts[2]).addAdmin(newAdmin.address) ).to.be.reverted
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

            return contract.connect(deployer).addAdmin(newAdmins[0].address)
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
                                    return log.event === 'NewAdmin'
                                        && log.args._admin ===  newSuperAdmin.address
                                        && log.args.isSuperAdmin === true;
                                });
                            });

                            return contract.connect(newSuperAdmin).addAdmin(newAdmins[1].address)
                        });
                });
        });
    });

    describe('Testing votes with 2 or more SuperAdmins', function() {
        // Test for odd and even number of superAdmins
        let scenarios,
            superAdmins, newAdmin, removeAdmin;

        beforeEach(async () => {
            scenarios = [
                {superAdmins: [accounts[0]]}, // two superadmins
                {superAdmins: [accounts[0], accounts[1]]}, //three superadmins
                {superAdmins: [accounts[0], accounts[1], accounts[2]]}, // four superadmins
                {superAdmins: [accounts[0], accounts[1], accounts[2], accounts[3]]}, // 5 superadmins
            ];

            newAdmin = accounts[5];
            removeAdmin = accounts[0];

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

        it('Either superadmin should be able to add admins on their own', function() {
            return Promise.all( scenarios.map(scenario => {
                let {contract, superAdmins} = scenario;

                    return contract.connect(superAdmins[0]).addAdmin(newAdmin.address)
                        .then(() => contract.connect(newAdmin).adminTestFn())
                        .then(res => expect(res).to.be.true);
            }));
        });

        it('Should not be able to add existing superadmin', function() {
            let superAdmin = deployer;

            return Promise.all( scenarios.map(scenario => {
                if(scenario.superAdmins.length < 5) {
                    let voter = scenario.superAdmins[0];
                    let {contract} = scenario;

                    return expect(
                        contract.connect(voter).addSuperAdmin(superAdmin.address)
                    ).to.be.reverted;

                    return expect(
                        contract.connect(superAdmin).superAdminTestFn()
                    ).to.be.reverted;
                }
            }))
        });

        it('addAdmin should emit a VoteAdded event only, but new superadmin should not be added', function() {
            return Promise.all( scenarios.map(scenario => {
                let voter = scenario.superAdmins[0];

                if(scenario.superAdmins.length < 5) {
                    return scenario.contract.connect(voter).addSuperAdmin(newAdmin.address)
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
                                scenario.contract.connect(newAdmin).superAdminTestFn()
                            ).to.be.reverted;
                        });
                }
            }))
        });

        it('Disallow multiple votes', function() {
            return Promise.all( scenarios.map(scenario => {
                let voter = scenario.superAdmins[0];
                let { contract } = scenario;

                return contract.connect(voter).removeSuperAdmin(removeAdmin.address)
                    .then(() => {
                        return expect( contract.connect(voter).removeSuperAdmin(removeAdmin.address) )
                            .to.be.reverted
                    })
            }))
        });

        it('Superadmin should not be removed if less than half of superadmins vote to remove', function() {
            return Promise.all( scenarios.map(scenario => {
                const { superAdmins, contract } = scenario;

                let halfpoint = Math.floor(superAdmins.length/2);

                let voters = superAdmins.slice(0, halfpoint);

                return contract.connect(removeAdmin).superAdminTestFn()
                    .then(res => {
                        expect(res).to.be.true

                        return voters.map( (voter, voterIndex) => {
                            return contract.connect(voter).removeSuperAdmin(removeAdmin.address)
                            .then(tx => tx.wait())
                                .then(tx => {
                                    let voteEvent = tx.events.some(log => {
                                        return log.event === 'VoteAdded'
                                            && log.args._voter ===  voter.address;
                                    });

                                    expect(voteEvent).to.be.true;
                                })
                        })
                    })
                    .then(() => {
                         return contract.connect(removeAdmin).superAdminTestFn()
                        .then(res => expect(res).to.be.true);
                    });
            }).flat())
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

        it('Should need more than half of superAdmins to add new superadmin', function() {
            return Promise.all( scenarios.map(scenario => {
                const { superAdmins, contract } = scenario;

                if(superAdmins.length < 5) {

                    let halfpoint = Math.ceil(superAdmins.length/2);
                    if(superAdmins.length % 2 == 0) halfpoint++;

                    let voters = superAdmins.slice(0, halfpoint), votes = 0;

                    return expect(contract.connect(newAdmin).superAdminTestFn()).to.be.reverted
                        .then(() => {
                            // recurring function here
                            function voteOp(voterArray, currentIndex) {
                                let voter = voterArray[currentIndex];

                                return contract.connect(voter).addSuperAdmin(newAdmin.address)
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
                                            return expect( contract.connect(newAdmin).superAdminTestFn() ).to.be.reverted
                                        }
                                        else {
                                            return contract.connect(newAdmin).superAdminTestFn()
                                                .then(res => expect(res).to.be.true);
                                        }
                                    })
                                    .then(() => {
                                        if(currentIndex > 0) 
                                            return voteOp(voterArray, currentIndex - 1);
                                    });
                            }

                            return voteOp(voters, voters.length - 1);
                        })
                        .then(() =>
                            contract.connect(newAdmin).superAdminTestFn().then(res => expect(res).to.be.true)
                        );
                }
            }).flat())
        });
    });
});
