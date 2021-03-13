import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Main.js';
import Web3 from 'web3';
import ipfs from './ipfs';
import BigNumber from "bignumber.js";



class Buy extends Component {

    constructor(props) {
        super(props)
        this.state = {
            ArtID: '',
            nftstatus: 'your nft will show here when bought'
        }
    }





    


    render() {

        return ( 
            <div>
            <div className = 'card' style = {{position: 'absolute', left: '500px', color: 'black'}}>
                <div className = 'card-body'> 
                <form onSubmit={(event) => {
                            event.preventDefault();
                            window.web3 = new Web3(window.ethereum);
                            window.ethereum.enable();
                            const web3 = window.web3;
                          

                            this.props.ReceiveEthAndMint(this.state.ArtID)

                           
                            
                            }}> 
                     <label> Art ID</label>
                     <input type="number"  onChange={(event) => {
                                let ArtID = this.input.value
                                this.setState({ ArtID: ArtID })
                            }}
                                ref={(input) => { this.input = input }}/>
                     <button 
                       className = 'btn btn-primary' style = {{marginTop: '2%'}}> buy nft with eth </button>
                </form>
                
                </div>

            </div>
                            <div className = 'card' style = {{position: 'absolute', right: '150%', color: 'black'}}> 
                            <p> {this.state.nftstatus}</p>
                            <embed src = {this.props.tokenURI}/> 
                        </div>
                         </div>
        );
    }
}

export default Buy;