const hh = require('hardhat');

function verifyContracts() {
    return run('verify:verify', {
        address: '0x60e87ef45a6b938e75dffdd667c3fe37fa723b5a',
        contract: "contracts/theWellNFT"
    });
}

verifyContracts();
