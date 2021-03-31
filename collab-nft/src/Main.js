import './App.css';

import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

import Buy from './buy.js';
import Sell from "./sell.js";



class Main extends Component {

    constructor(props) {
        super(props)
        this.state = {
            sellingArt: 'true'
        
        }
    }


    render() {
        let content
        if (this.state.sellingArt === 'true') {
            content = <Sell
                ethBalance={this.props.ethBalance}
                collabNFTtokenBalance = {this.props.collabNFTtokenBalance}
                collabNFTTokenData = {this.props.collabNFTTokenData}
                collabNFTtoken = { this.props.collabNFTtoken}
                collabNFTBytecode =  { this.props.collabNFTBytecode}
                deployContract =  {this.props.deployContract}
                AddArt = {this.props.AddArt}
                ChangeArtPrice = {this.props.ChangeArtPrice}
                AddCollaboratorsAndTheirRewardPercentage = {this.props.AddCollaboratorsAndTheirRewardPercentage}
                updatePercentageRewardForCollaborators = {this.props.updatePercentageRewardForCollaborators}
                newCollabnftContractAddress = {this.props.newCollabnftContractAddress}
                deployed = {this.props.deployed}
            />
        } else {
            content = <Buy
                ethBalance={this.props.ethBalance}
                collabNFTtokenBalance = {this.props.collabNFTtokenBalance}
                collabNFTTokenData = {this.props.collabNFTTokenData}
                collabNFTtoken = { this.props.collabNFTtoken}
                collabNFTBytecode =  { this.props.collabNFTBytecode}
                ReceiveEthAndMint = { this.props.ReceiveEthAndMint}
                ipfsHash = { this.props.ipfsHash}
                tokenURI = {this.props.tokenURI}
     

            />
        }
 
        return (
            <div className='card'>
                <div className='card-body' style = {{padding: '3px'}}>
                        <button  onClick={(event) => { this.setState({ sellingArt: 'false', StakeBgColor: 'lightgrey', WithdrawBgColor: 'white' }) }} style={{ backgroundColor: this.state.StakeBgColor }} >
                         <h6 style = {{fontSize: '1.8vw'}}> buy nft</h6>
                        </button>
                        <button type="submit"  onClick={(event) => { this.setState({ sellingArt: 'true', StakeBgColor: 'white', WithdrawBgColor: 'lightgrey' }) }} style={{ backgroundColor: this.state.WithdrawBgColor }}>
                            <h6 style = {{fontSize: '1.8vw'}} > artist nft page</h6>
                        </button>
                    {content}
                </div>
            </div>
        );
    }
}

export default Main;
