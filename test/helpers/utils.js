// Creates a bid object

function Bid(bidData) {
    let { bidder, recipient, token, amount, sellOnShare = '25' } = bidData;

    if(!recipient)
        recipient = bidder;

    amount = amount.toString();

    if(token.address)
        token = token.address;

    return {
        currency:token,sellOnShare:{value:sellOnShare},
        bidder,
        amount:{value: amount},recipient
    };
}

module.exports = {
    Bid
}
