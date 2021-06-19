# Collector Crowdsale Contract
The contract in question is at `./CollectorCrowdsale.sol`

## Add collector purchase option (ie, benefactor, directors council)
- Deploy Tokens to be used in crowdsale
- Deploy crowdsale contract
- Give crowdsale contract minter role on erc20s
- Add new purchaseOption([...ERC20s], [...amountsInWEI], priceInWEI, name)

## Edit purchase option

    /*
       Collector Membership Purchase Options, eg
       [{
            name: 'Benefactors Council',
            tokens: { FRESH: 3, WELL: 5 },
            priceInETH: 15
        }]
    */
