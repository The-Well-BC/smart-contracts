function whitelistBuyer() {
    let buyer = document.getElementById('buyerAddr').value;
    console.log('buyer', buyer);

    if(!buyer)
        alert('Enter Buyer Address');
    else if(buyer.length < 11)
        alert('Enter at least 11 characters');
    else {
        console.log('Adding buyer', buyer, 'to whitelist');
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

        return CrowdsaleContract.methods.addToWhitelist(buyer).send({ from: account })
        .then(res => {
            console.log('Added buyer to whitelist', buyer);
             alert('Successfully added buyer to whitelist');
        }).catch(e => {
            /*
            console.log('e.value.code.data', e.value.code.data);

            if(e.value.code.data.message.includes('revert Owner only function'))
                alert('You are not the owner of this contract.');

            else
                console.log('Error:', e);
            */

            alert('Error adding buyer to whitelist. Make sure you are the owner of the contract');
        });
    }
}
