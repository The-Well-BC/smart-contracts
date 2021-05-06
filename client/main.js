let connect = document.createElement('button');
connect.innerText = 'Connect Wallet';
connect.onclick = connectWallet;

let addressElement = document.createElement('p');
let account;

const initialise = function() {
    if(typeof window.ethereum)  {
        // Metamask is installed
        if(window.ethereum.selectedAddress) {
            account = window.ethereum.selectedAddress;
            addressElement.innerText = window.ethereum.selectedAddress;
            document.getElementById('menu').appendChild(addressElement);
        } else {
            document.getElementById('menu').appendChild(connect);
        }

    } else {
        alert('Please startup or install Metamask. If you\'re on Brave, use the CrytoWallets plugin');
    }
}

function connectWallet() {
    return window.ethereum.request({ method: 'eth_requestAccounts' })
    .then(res => {
        console.log('Connected Metamask:', res);
        console.log('Connected Account:', window.ethereum.selectedAddress);

        account = window.ethereum.selectedAddress;
        addressElement.innerText = window.ethereum.selectedAddress;
        document.getElementById('menu').removeChild(connect);
        document.getElementById('menu').appendChild(addressElement);
    });
}

window.onload = initialise();

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

    const contractAddress = '0xb08bFb926fBc6Fa6B6c5DaA6591E7c48c56a5966';

    const CrowdsaleContract = new web3.eth.Contract(contractABI, contractAddress);

    const purchaseAmount = web3.utils.toWei('25', 'ether');
    return CrowdsaleContract.methods.buyTokens(account).send({ from: account, value: purchaseAmount })
    .then(res => {
        console.log('Bought tokens. Check wallet now');
    });
} 
