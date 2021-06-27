module.exports = async function(fundsCollector) {
    const CollectorCrowdsale = await ethers.getContractFactory('CollectorCrowdsale');

    const crowdsale = await CollectorCrowdsale.deploy(
        fundsCollector
    )

    return crowdsale;
}

