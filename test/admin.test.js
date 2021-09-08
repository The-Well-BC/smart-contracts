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

    describe('Duplicate admins/superadmins fails', function() {
        // Test for odd and even number of superAdmins
        let scenarios,
            superAdmins, newAdmin, removeAdmin;

        beforeEach(async () => {
            scenarios = [];
            newAdmin = accounts[4];
            removeAdmin = accounts[2];

            return Promise.all([
                [],
                [accounts[0]],
                [accounts[0], accounts[1]],
                [accounts[0], accounts[1], accounts[2]], // for even number of superadmins
                [accounts[0], accounts[1], accounts[2], accounts[3]], // for odd number of superadmins
            ].map((_newSuperAdmins, i) => {
                // set superadmins if none
                if(!scenarios[i]) {
                    scenarios[i] = { superAdmins: [deployer] };
                }

                return newContract()
                .then(c => {
                    scenarios[i].contract = c;
                    return Promise.all(
                        _newSuperAdmins.map(newSuperAdmin => {
                            // Call all previous superadmins to add new superadmin
                            return Promise.all(
                                scenarios[i].superAdmins.map(superAdmin => {
                                    return c.connect(superAdmin).addSuperAdmin(newSuperAdmin.address)
                                        .then(() => scenarios[i].superAdmins.push(newSuperAdmin))
                                })
                            );
                        })
                    )
                });
            }));
        });

        it('Should not be able to add existing superadmin', function() {
            let superAdmin = deployer;

            return Promise.all( scenarios.map(scenario => {
                let voter = scenario.superAdmins[0];
                let {contract} = scenario;

                return expect(
                    contract.connect(voter).addSuperAdmin(superAdmin.address)
                ).to.be.reverted;

                return expect(
                    contract.connect(superAdmin).superAdminTestFn()
                ).to.be.reverted;
            }))
        });

        it('Either superadmin should be able to add admins on their own', function() {
            let newAdmin = accounts[8];

            return Promise.all( scenarios.map(scenario => {
                let {contract, superAdmins} = scenario;

                return contract.connect(superAdmins[0]).addAdmin(newAdmin.address)
                    .then(() => contract.connect(newAdmin).adminTestFn())
                    .then(res => expect(res).to.be.true);
            }));
        });
    });

    describe('Testing votes with 2 SuperAdmins', function() {
        let contract, superAdmins;

        beforeEach(() => {
            return newContract()
            .then(res => {
                contract = res;

                superAdmins = [accounts[0]];

                return contract.addSuperAdmin(superAdmins[0].address)
                .then(tx => tx.wait())
                .then(res => {
                    superAdmins.push(deployer);
                });
            });
        });


        it('Should add superadmin only after getting two admin votes', function() {
            let newAdmin = accounts[2];

            return contract.connect(superAdmins[0]).addSuperAdmin(newAdmin.address)
                .then(() =>
                    expect(contract.connect(newAdmin).adminTestFn()).to.be.reverted
                )
                .then(() => {
                    return contract.connect(superAdmins[1]).addSuperAdmin(newAdmin.address)
                        .then(() => contract.connect(newAdmin).superAdminTestFn())
                        .then(res => expect(res).to.be.true);
                });
        });
    });

    describe('Testing votes with 2 or more SuperAdmins', function() {
        // Test for odd and even number of superAdmins
        let scenarios,
            superAdmins, newAdmin, removeAdmin;

        beforeEach(async () => {
            console.log('starting beforeach');
            scenarios = [
                {newSuperAdmins: [accounts[0]]},
                {newSuperAdmins: [accounts[0], accounts[1]]},
                {newSuperAdmins: [accounts[0], accounts[1], accounts[2]]}, // for even number of superadmins
                {newSuperAdmins: [accounts[0], accounts[1], accounts[2], accounts[3]]}, // for odd number of superadmins
            ];

            newAdmin = accounts[5];
            removeAdmin = accounts[0];

            return Promise.all( scenarios.map((scenario) => {
                // set superadmins if none
                scenario.superAdmins = [deployer];

                console.log('\n\nABOUT TO SET CONTRACT\nNew SuperAdmins:', scenario.newSuperAdmins.map(a => a.address));
                return newContract()
                    .then(c => {
                        scenario.contract = c;
                        console.log('CONTRACTS SET:', scenario.contract.address);
                        return Promise.all(
                            scenario.newSuperAdmins.map(newSuperAdmin => {
                                console.log('SUPERADMINS for scenario', scenario.superAdmins.map(sa => sa.address));
                                // Call all previous superadmins to add new superadmin
                                return Promise.all(
                                    scenario.superAdmins.map(superAdmin => {
                                        console.log('super admin', superAdmin.address, 'to add:', newSuperAdmin.address);
                                        return scenario.contract.connect(superAdmin).addSuperAdmin(newSuperAdmin.address)
                                            .then(tx => tx.wait())
                                            .then(res => {
                                                console.log('EVENTS:', res.events);
                                                scenario.superAdmins.push(newSuperAdmin)
                                                console.log('SCENARIO I SUPERADMINS UPDATED:', scenario.superAdmins.map(sa => sa.address));
                                                return true;
                                            })
                                    })
                                );
                            }).flat()
                        )
                    }).then(() => {
                        return Promise.all(newSuperAdmins.map(superAdm => {
                            return scenario.contract.connect(superAdm).superAdminTestFn()
                                .then(res => expect(res).to.be.true);
                        }))
                    });
            }));
        });

        it('addAdmin should emit a VoteAdded event only, but new superadmin should not be added', function() {
            return Promise.all( scenarios.map(scenario => {
                let voter = scenario.superAdmins[0];

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

        it('More than half the superAdmins should be able to vote to remove an admin', function() {
            return Promise.all( scenarios.map(scenario => {
                const { superAdmins, contract } = scenario;

                let halfpoint = Math.ceil(superAdmins.length/2);
                if(superAdmins.length % 2 == 0) halfpoint++;

                if(superAdmins.length != 2) {
                    console.log('\nSUPER ADMIN LENGTH IN JS:', superAdmins.length);
                    let voters = superAdmins.slice(0, halfpoint);
                    console.log('SUER ADMINS:', superAdmins.map(a => a.address));

                    return Promise.all(voters.map( voter => {
                        console.log('VOTER ADDR:', voter.address);
                        return contract.connect(voter).removeSuperAdmin(removeAdmin.address)
                            .then(tx => tx.wait())
                            .then(tx => {
                                console.log('SUPER ADMINS boolean log:', tx.events[1].args._boolean);
                                // console.log('SUPER ADMINS LENGTH:', tx.events[0].args._number.toString());
                                expect(tx.events).to.satisfy(logs => {
                                    return logs.some(log => {
                                        return log.event === 'VoteAdded'
                                            &&
                                            log.args._voter ===  voter.address;
                                    });
                                });

                                // check that removeAdmin still has superadmin privileges
                                return contract.connect(removeAdmin).adminTestFn()
                                    .then(res => expect(res).to.be.true);
                            })

                    }).flat())
                        .then(() =>
                            expect( contract.connect(removeAdmin).adminTestFn() ).to.be.reverted
                        );
                }
            }).flat())
        });

        it.skip('Should need more than half of superAdmins to add new superadmin', function() {
            return Promise.all( scenarios.map(async scenario => {
                const { superAdmins, contract } = scenario;

                let halfpoint = Math.ceil(superAdmins.length/2);
                if(superAdmins.length % 2 == 0) halfpoint++;

                let voters = superAdmins.slice(0, halfpoint);

                // Test that newAdmin doesn't have superadmin privileges yet
                await expect(contract.connect(newAdmin).superAdminTestFn())
                    .to.be.revertedWith('is not superadmin')

                return Promise.all(voters.map( voter => {
                    contract.connect(voter).addSuperAdmin(newAdmin.address)
                }))
                    .then(() => {
                        return contract.connect(newAdmin).superAdminTestFn()
                            .then(res => expect(res).to.be.true);
                    })
            }).flat())
        });
    });
});
