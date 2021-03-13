import React, { Component } from 'react'
import 'bootstrap/dist/css/bootstrap.min.css';
import Web3 from 'web3';
import  collabNFT from "./collabNFT";

class Navbar extends Component {





  constructor(props) {
    super(props)
    this.state = {
      account: '',
      networkID: '',
      ethBalance:'',

    }

  }

  render() {
    return (
      <nav className = "navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
        <a  href=''
        className = 'navbar-brand col-sm-3 col-md-2 mr-0'
        target = 'blank'
        rel = 'noopener noreferrer'
        >
          <p> collab-NFT CONTRACT</p>
        </a>
        <button className = 'btn btn-primary' style = {{position: 'absolute', left: '600px'}}  onClick = {(event) => {
          event.preventDefault()

          this.props.loadEverything()

        }}> connect wallet </button> 

   

      
      

        <ul className='nav-bar-nav px-3'>
          <li className='nav-item text-nowrap d-none d-sm-none d-sm-block'>
            <small className= 'text-secondary'>
              <small id ="account" style = {{color: "white"}}> {this.props.account} </small>
            </small>
          

          </li>
          <span style = {{color: "white"}}> 
          { this.props.collabNFTtokenBalance} NFT
          </span>
        </ul>

        
        
      </nav> 
    );
  }
}

export default Navbar;
