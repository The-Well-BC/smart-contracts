const deploy = require('../deploy');

async function mintNFT(mintSingle=false) {
    let deployed = await deploy();

    const { accounts,
        marketplace: TheWellMarketplace,
        nft: TheWellNFT,
        weth:goodToken, fresh:badToken
    } = deployed;

    const buyers = [
        accounts[1], accounts[2], accounts[15], accounts[16]
    ];

    // Array of artists. Each test should use a different artist so we have a clean slate
    let nftArr;

    if(mintSingle == 'single') {
        nftArr = [{
            artist: accounts[5],
            collaborators: [ accounts[3], accounts[4], accounts[8]],
        }, {
            artist: accounts[6],
            collaborators: [ accounts[9], accounts[10], accounts[11]],
        }, {
            artist: accounts[7],
            collaborators: [ accounts[12], accounts[13], accounts[14]],
        }];
    } else {
        nftArr = [{
            artist: accounts[5],
            collaborators: [ accounts[3], accounts[4], accounts[8]],
        }];
    }

    const creatorsRoyalties =  50;

    return Promise.all( nftArr.map(creators => {
        return TheWellNFT.connect(creators.artist).mint(
            65,
            creators.collaborators.map(c => c.address),
            [20, 10, 5],
            'Qmblah123.json'
        )
    }))
        .then(res => Promise.all(res.map(re => re.wait())))
        .then(res => {
            res.forEach((r, index) => {
                nftArr[index].token = {
                    id: r.events.filter(log => log.event == 'Transfer')[0]
                    .args.tokenId.toString()
                }
            });

            return { nftArr, TheWellMarketplace, TheWellNFT, goodToken, badToken, buyers };
        });
}

function listNFT() {
    return listNFTs('single')
    .then(res => {
        return { ...res, nft: res.nft }
    });
}

function listNFTs(mintSingle='multiple') {
    let nftArr, TheWellMarketplace, TheWellNFT, goodToken, badToken, buyers;

    return mintNFT('single')
        .then(res => {
            ({ nftArr, TheWellMarketplace, TheWellNFT, goodToken, badToken, buyers } = res);

            nftArr = nftArr.map(nft => {
                return {
                    ...nft,
                    token: {
                        price: parseInt(
                            ethers.utils.parseEther((Math.random()).toString()) / 10000
                        ),
                        id: nft.token.id
                    }
                }
            });

            return Promise.all(
                nftArr.map(nft => 
                    TheWellMarketplace.connect(nft.artist).setAsk(nft.token.id, nft.token.price.toString(), goodToken.address)
                )
            );
        }).then(res => Promise.all(res.map(r => r.wait())))
        .then(async res => {
            console.log('aSKS set', res);
            // console.log('TOKEN PRICES:', nftArr.map(nft => nft.token.price));

            res[0].events.filter(e => e.event == 'DecimalLog' || e.event == 'NumberLog').map(e => {
                console.log(e.event, ' - ', e.args.message_, e.args.value_.toString());
            });

            return Promise.all( nftArr.map(nft =>  
                TheWellNFT.connect(nft.artist).approve(TheWellMarketplace.address, nft.token.id)
            )).then(() => {
                return { nftArr, TheWellMarketplace, TheWellNFT, goodToken, badToken, buyers };
            });
        });
}

function sellNFTs() {
    // let nftArr, TheWellMarketplace, TheWellNFT, goodToken, badToken, buyers;

    return listNFTs()
        .then(res => {
            // ({ nftArr, TheWellMarketplace, TheWellNFT, goodToken, badToken, buyers } = res);

            const { nftArr, TheWellMarketplace, goodToken, badToken, buyers } = res;

            const purchaseTokenBalance = ethers.utils.parseEther('4');

            return Promise.all(
                buyers.map(buyer => [
                    goodToken.connect(buyer).deposit({value:purchaseTokenBalance}),
                    badToken.mint(buyer.address, purchaseTokenBalance)
                ]).flat()
            ).then(() => {
                return Promise.all(
                    buyers.map(buyer => [
                        goodToken.connect(buyer).approve(TheWellMarketplace.address, purchaseTokenBalance),
                        badToken.connect(buyer).approve(TheWellMarketplace.address, purchaseTokenBalance),
                    ]).flat()
                );
            }).then(() => {
                return { nftArr, TheWellMarketplace, TheWellNFT, goodToken, WETH:goodToken, badToken, FRESH:badToken, buyers };
            });
        });
}

module.exports = {
    mintNFT,
    sellNFTs,
    listNFT,
    listNFTs
}
