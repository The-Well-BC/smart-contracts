import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';




class Deployed extends Component {

    constructor(props) {
        super(props)
        this.state = {
            liveContract: 'not live'
        }
    }






    render() {
        if (this.props.deployed === true) {
            const address = this.props.newCollabnftContractAddress
            this.setState({ liveContract: address })
        } else {}
        return (
            <div className='card' style={{ position: 'absolute', left: '100px', color: 'black' }}>
                <div className='cardbody'>
                    your nft contract address is {this.state.liveContract}
                </div> 
            </div>
        );
    }
}

export default Deployed;