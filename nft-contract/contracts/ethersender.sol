pragma solidity ^0.8.0;


contract sender{
    
    function sendeth( address payable account) public{
         
        account.transfer(address(this).balance/2);
    }
    function receiveETH() public
     payable{
         
     }
        
    
}      