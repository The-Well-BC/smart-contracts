const readline = require('readline');

module.exports = function (message){
    const r1 = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise(resolve => {
        r1.question(message, (answer => {
            resolve(answer);
        }))
    });
}
