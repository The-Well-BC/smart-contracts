const chai = require('chai');
chai.use(
    require('chai-as-promised')
);
const { expect } = chai;
const faker = require('faker');

describe.only('Update subgraph', function() {
    let subgraphUpdater;

    before(async() => {
        return ethers.getContractFactory('SubgraphUpdater')
            .then(res => res.deploy())
            .then(res => res.deployed())
            .then(res => subgraphUpdater = res);
    });

    it('Emit a message', function() {
        const message = 'adfadfa';
        return subgraphUpdater.update(message, [])
            .then(res => res.wait())
            .then(res => {
                let events = res.events;
                expect(events[0]).to.have.property('event', 'UpdateSubgraph');
                const e = events[0];

                expect(e.args).to.have.property('message', message);
            });
    });

    it('Emit a message with a text parameter', function() {
        const message = 'adfadfa';
        const param1 = Array.from(4).fill(0).map(() => faker.lorem.words());
        param1.push('1');

        return subgraphUpdater.update(message, param1)
            .then(res => res.wait())
            .then(res => {
                let events = res.events;
                expect(events[0]).to.have.property('event', 'UpdateSubgraph');
                const e = events[0];

                expect(e.args).to.include.keys('message', 'params');
                expect(e.args).to.have.property('message', message);
                expect(e.args.params).to.have.members(param1);
            });
    });

    it('Emit a message with multiple text parameter', function() {
        const message = 'adfadfa';
        const param1 = [faker.random.words()];

        return subgraphUpdater.update(message, param1)
            .then(res => res.wait())
            .then(res => {
                let events = res.events;
                expect(events[0]).to.have.property('event', 'UpdateSubgraph');
                const e = events[0];

                expect(e.args).to.include.keys('message', 'params');
                expect(e.args).to.have.property('message', message);
                expect(e.args.params).to.have.members(param1);
            });
    });
});
