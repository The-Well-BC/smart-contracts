import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Main.js';
import Web3 from 'web3';

class Collaborators extends Component {
    constructor(props) {
        super(props)
        this.state = {
            NewCollaborator: '',
            rewardinpercentage: '',
            Collaborator: '',
            updatepercentage: ''
        }
    }

    render() {
        return ( 
        <div>
            <div className='card' style={{ position: 'absolute', width: '250px', top: '200px', left: '290px', color: 'black' }}>
                <div className='card-body' >
                    <form onSubmit={(event) => {
                        event.preventDefault();
                        window.web3 = new Web3(window.ethereum);
                        window.ethereum.enable();
                        // const web3 = window.web3;
                  
                        let CollaboratingArtist;
                        let RewardPercentage;
                        CollaboratingArtist = this.state.NewCollaborator;
                        RewardPercentage = this.state.rewardinpercentage;
                        this.props.AddCollaboratorsAndTheirRewardPercentage(CollaboratingArtist, RewardPercentage);
                    }}>
                        <h6> adds new collaborator address and their percentage reward to smart contract</h6>
                        <label>  <h6>AddCollaborator address</h6> </label>
                        <input type="text" style={{ width: '200px' }} onChange={(event) => {
                            let NewCollaborator = this.input.value;
                            this.setState({ NewCollaborator: NewCollaborator })
                        }}
                            ref={(input) => { this.input = input }}/>
                        
                        <label>  <h6>Add Reward in percentage</h6> </label>
                        <input type="number" style={{ width: '200px' }} onChange={(event) => {
                            let rewardinpercentage = this.input2.value
                            this.setState({ rewardinpercentage: rewardinpercentage })
                        }}
                            ref={(input) => { this.input2 = input }}/>
                       
                        <button className='btn btn-primary' style={{ marginTop: '1%' }}>
                            Add
                    </button>
                    </form>
                </div>
            </div>
            <div className='card' style={{ position: 'absolute', width: '250px', top: '200px', left: '550px', color: 'black' }}>
                <div className='card-body' >
                    <form onSubmit={(event) => {
                        event.preventDefault()

                        this.props.updatePercentageRewardForCollaborators(this.state.Collaborator, this.state.updatepercentage)
                    }}>
                        <h6>update reward for collaborator </h6>
                        <label>  <h6>input saved collaborator address </h6> </label>
                        <input type="text" style={{ width: '200px' }} onChange={(event) => {
                            event.preventDefault()
                            const Collaborator = this.input3.value
                            this.setState({ Collaborator: Collaborator })
                        }}
                            ref={(input) => { this.input3 = input }}/>
                        
                        <label>  <h6>update collaborator Reward in percentage</h6> </label>
                        <input type="number" style={{ width: '200px' }} onChange={(event) => {
                            event.preventDefault()
                            const updatepercentage = this.input4.value
                            this.setState({ updatepercentage: updatepercentage })
                        }}
                            ref={(input) => { this.input4 = input }}/>
                       
                        <button className='btn btn-primary' style={{ marginTop: '1%' }}>
                            Update
                    </button>
                    </form>
                </div>
            </div>

        </div>
        );
    }
}

export default Collaborators;
