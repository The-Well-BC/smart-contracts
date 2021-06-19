function purchase() {
    console.log('Purchasing tokens');
    const web3 = new Web3(window.ethereum);

    const contractABI = [
		{
			"inputs": [
				{ "internalType": "uint256", "name": "tokensPerWei_", "type": "uint256" },
				{ "internalType": "address payable", "name": "wallet_", "type": "address" },
				{ "internalType": "contract IERC20", "name": "token_", "type": "address" }
			],
			"stateMutability": "nonpayable",
			"type": "constructor"
		}, {
			"anonymous": false,
			"inputs": [
				{ "indexed": true, "internalType": "address", "name": "purchaser", "type": "address" },
				{ "indexed": true, "internalType": "address", "name": "beneficiary", "type": "address" },
				{ "indexed": false, "internalType": "uint256", "name": "value", "type": "uint256" },
				{ "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
			],
			"name": "TokensPurchased",
			"type": "event"
		},
		{ "stateMutability": "payable", "type": "fallback" },
		{
			"inputs": [
				{ "internalType": "address", "name": "beneficiary_", "type": "address" }
			],
			"name": "addToWhitelist",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		}, {
			"inputs": [
				{ "internalType": "address", "name": "beneficiary_", "type": "address" }
			],
			"name": "buyTokens",
			"outputs": [],
			"stateMutability": "payable",
			"type": "function"
		}, {
			"inputs": [],
			"name": "rate",
			"outputs": [
				{ "internalType": "uint256", "name": "", "type": "uint256" }
			],
			"stateMutability": "view",
			"type": "function"
		}, {
			"inputs": [],
			"name": "token",
			"outputs": [
				{ "internalType": "contract IERC20", "name": "", "type": "address" }
			],
			"stateMutability": "view",
			"type": "function"
		}, {
			"inputs": [],
			"name": "wallet",
			"outputs": [
				{ "internalType": "address payable", "name": "", "type": "address" }
			],
			"stateMutability": "view",
			"type": "function"
		}, {
			"inputs": [
				{ "internalType": "address", "name": "", "type": "address" }
			],
			"name": "whitelist",
			"outputs": [
				{ "internalType": "bool", "name": "", "type": "bool" }
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"stateMutability": "payable",
			"type": "receive"
		}
	];

    let contractAddress = contractAddresses.CROWDSALE_CONTRACT;

    const CrowdsaleContract = new web3.eth.Contract(contractABI, contractAddress);

    const purchaseAmount = web3.utils.toWei('25', 'ether');
    return CrowdsaleContract.methods.buyTokens(account).send({ from: account, value: purchaseAmount })
    .then(res => {
        // Add Tokens to User's wallet
        // $WELL

        return Promise.all([
            window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: contractAddresses.WELL_TOKEN_CONTRACT,
                        symbol: 'WELL',
                        decimals: 20
                    }
                }
            }),
            window.ethereum.request({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC20',
                    options: {
                        address: contractAddresses.FRESH_TOKEN_CONTRACT,
                        symbol: 'FRESH',
                        decimals: 18,
                    }
                }
            })
        ]).then(res => {
            console.log('Added Well Token to user\'s wallet:', res[0]);
            console.log('Added $FRESH to wallet:', res[1]);
            alert('Bought tokens. Check wallet now');
        });
    });
} 
