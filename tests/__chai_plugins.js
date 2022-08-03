const chai = require('chai');
const { solidity } = require('ethereum-waffle');

chai.use(
    require('chai-as-promised')
);

chai.use(solidity);
