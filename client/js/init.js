let connect = document.createElement('button');
connect.innerText = 'Connect Wallet';
connect.onclick = connectWallet;

let addressElement = document.createElement('p');
let account;

let contractAddresses;
function setContractAddresses(chainID) {
    if(!chainID)
        alert ("Network ChainID not set");
    else {
        // Ropsten
        if(chainID == '0x3') {
            console.log('Setting addresses for Ropsten network');
            contractAddresses = ropstenContracts;

        } else if(chainID = '0x539') {
            contractAddresses = localContracts;
        } else {
            alert("Please make sure you are connected to the 'Ropsten' testnet");
        }

        console.log('Contract Addresses:', contractAddresses);
    }
}

const initialise = function() {
    if(typeof window.ethereum)  {
        window.ethereum.on('chainChanged', (_chainId) => window.location.reload());

        // Metamask is installed
        if(window.ethereum.selectedAddress) {
            account = window.ethereum.selectedAddress;
            addressElement.innerText = window.ethereum.selectedAddress;
            document.getElementById('menu').appendChild(addressElement);
        } else {
            Array.prototype.slice.call(document.getElementsByTagName('button'))
                .forEach(el => {
                console.log('Button Element:', el);
                    el.disabled =true;
            });
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

        return window.ethereum.request({ method: 'eth_chainId' })
        .then(res => {
            console.log('Network Chain ID:', res);

            return setContractAddresses(res);
        }).then(res => {
            Array.prototype.slice.call(document.getElementsByTagName('button'))
                .forEach(el => {
                console.log('Button Element:', el);
                    el.disabled =false;
            });
        });
    });
}

window.onload = initialise();
