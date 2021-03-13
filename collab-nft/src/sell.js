import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Main.js';
import Web3 from 'web3';
import ipfs from './ipfs';

import Collaborators from "./collaborators";




class Sell extends Component {

    constructor(props) {
        super(props)
        this.state = {
            NAME: '',
            ARTIST: '',
            ARTPRICE: '0',
            SYMBOL: '',
            contractAddress: '0x',
            ARTNAME: '',
            NewArtPrice: '',
            NewCollaborator: '',
            rewardinpercentage: '',
            updatepercentage: '',
            Collaborator: '',
            IFPSHASH: '',
            buffer: '',
            AddCollaborators: false 

        }
    }









    render() { 
        let content 
        if (this.state.AddCollaborators === true){
            content = <Collaborators
            AddCollaboratorsAndTheirRewardPercentage = {this.props.AddCollaboratorsAndTheirRewardPercentage}
            updatePercentageRewardForCollaborators = {this.props.updatePercentageRewardForCollaborators}/>
        } else {}

    


        return (
            <div>


                <div className='card'>
                    <div className='cardbody' className='card' style={{ position: 'absolute', top: '-50px', right: '480px', color: 'black', padding: '10px' }}>
                        <p>click button below to deploy smart contract </p>


                        <form onSubmit={(event) => {
                            event.preventDefault()
                            window.web3 = new Web3(window.ethereum)
                            window.ethereum.enable()
                            const web3 = window.web3

                            let ARTPRICEinWei
                            ARTPRICEinWei = web3.utils.toWei(this.state.ARTPRICE, 'Ether')
                            this.props.deployContract(this.state.NAME, this.state.SYMBOL, ARTPRICEinWei)
                        }}>
                            <div className=' form-group'>
                                <label> name of token</label>
                                <input type="text" onChange={(event) => {
                                    const NAME = this.input.value.toString()
                                    this.setState({ NAME: NAME })
                                }}
                                    ref={(input) => { this.input = input }} placeholder={this.state.NAME}>

                                </input>
                            </div>

                            <div className='form-group'>
                                <label> symbol of token </label>
                                <input type="text" onChange={(event) => {
                                    const SYMBOL = this.input2.value.toString()
                                    this.setState({ SYMBOL: SYMBOL })
                                }}
                                    ref={(input) => { this.input2 = input }} placeholder={this.state.SYMBOL.toString()}>

                                </input>

                            </div>

                            <div className='form-group'>
                                <label> price of art in eth</label>
                                <input type="number" className='form-control' name='artprice' onChange={(event) => {
                                    const ARTPRICE = this.input3.value.toString()
                                    this.setState({ ARTPRICE: ARTPRICE })
                                }}
                                    ref={(input) => { this.input3 = input }} placeholder='0'>
                                </input>
                            </div>


                            <button class='btn btn-primary' type='submit'> deploy nft contract </button>

                        </form>
                    </div>
                </div>
                <div className='card' style={{ position: 'absolute', top: '120px', right: '20px', color: 'black', height: '300px' }}>
                    <div className='card-body'>
                        <form onSubmit={(event) => {
                            event.preventDefault()
                            window.web3 = new Web3(window.ethereum)
                            window.ethereum.enable()
                            const web3 = window.web3

                            ipfs.files.add(this.state.buffer, (error, result) => {
                                if (error) {
                                    console.error(error)
                                    return
                                } else {
                                    var ipfshashstring = result[0].hash
                           

                                    this.setState({ IFPSHASH: ipfshashstring.toString() })
                                
                                    let ArtName = this.state.ARTNAME;
                                    let IpfsHash = this.state.IFPSHASH;
                                    this.props.AddArt(ArtName, IpfsHash);

                                }
                            })

                        }}>
                            <label> <h6>Add Art Name and upload art media</h6> </label>
                            <input style={{ width: '200px' }} type="text" class="form-control" onChange={(event) => {

                                const ARTNAME = this.input4.value.toString()
                                this.setState({ ARTNAME: ARTNAME })
                            }}
                                ref={(input) => { this.input4 = input }} />

                            <br></br>
                            <input type="file" style={{ position: 'absolute', fontSize: '15px' }} onChange={(event) => {

                                const file = event.target.files[0]
                                const reader = new window.FileReader()
                                reader.readAsArrayBuffer(file)
                                reader.onloadend = () => {
                                    this.setState({ buffer: Buffer(reader.result) })
                                
                                }
                            }} />
                            <button className='btn btn-primary' style={{ marginTop: '15%' }}>
                                Add Art
                        </button>
                        </form>
                    </div>
                </div>
                <div className='card' style={{ position: 'absolute', width: '250px', top: '20px', left: '550px', color: 'black' }}>
                    <div className='card-body' >
                        <form onSubmit={(event) => {
                            event.preventDefault()

                            window.web3 = new Web3(window.ethereum)
                            window.ethereum.enable()
                            const web3 = window.web3
                    

                            let ArtPrice = this.state.NewArtPrice
                            this.props.ChangeArtPrice(ArtPrice)
                        }}>

                            <label> Change Art Price </label>
                            <input type="number" min = '0'style={{ width: '200px' }} onChange={(event) => {
                                let NewArtPrice = this.input5.value
                                this.setState({ NewArtPrice: NewArtPrice })
                            }}
                                ref={(input) => { this.input5 = input }} />

                            <button className='btn btn-primary' style={{ marginTop: '1%' }}>
                                Change Art Price
                        </button>
                        </form>
                    </div>
                </div>
             <div className='card' style={{ color: 'black', position: 'absolute', top: '20px', left: '290px', width: '250px', height: '164px' }}>
                    <div className='card-body'>
                        <h6>  when deployed, nft minting contract address will be shown here. </h6>
                        <h6> nft minting contract is {this.props.newCollabnftContractAddress}</h6>
                    </div>
                </div>
                <div>
                    <button className = 'btn btn-primary' onClick={(event) => {
                                event.preventDefault()
                                this.setState({AddCollaborators: true})
                            }} > 
                        add COLLABORATORS
                    </button>
                    {content}
                </div>

            </div>
        )

    }
}

export default Sell;