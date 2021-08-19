pragma solidity ^0.8.4;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Admin.sol";

contract TheWellTreasury is WellAdmin {
    uint256 public totalEthRecived;
    address payable MintFund;
    address ETH;

    event TokenDeposited( uint256 indexed amount, IERC20 token, address indexed depositor);
    event Withdrawal(uint256 indexed amount, IERC20 indexed token);
    event ReceivedEther(uint256 amount, address sender);

    constructor() {
        ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
    }
    receive() external payable {
        totalEthRecived++;
        emit ReceivedEther(msg.value, msg.sender);
    }

    function depositTokens(uint256 amount, IERC20 token) public {
        token.transferFrom(msg.sender, address(this), amount);
        emit TokenDeposited(amount, token, msg.sender);
    }

    function withdrawTokenOrEth(uint256 amount, IERC20 token) public wellAdmin {
        require(amount >= 1000 wei, "invalid amount to be sent");

        if(address(token) == ETH) {
            //donate to mintfund
            uint256 mintFundDonation = (amount * 25) / 1000;
            MintFund.transfer(mintFundDonation);

            // withdraw the rest to caller
            payable(msg.sender).transfer(amount - mintFundDonation);
            emit Withdrawal(amount, token);
        } else {
            //donate to mintfund
            uint256 mintFundDonation = (amount * 25) / 1000;
            token.transfer(MintFund, mintFundDonation);

            // withdraw the rest to caller
            token.transfer(msg.sender, amount - mintFundDonation);
            emit Withdrawal(amount, token);
        }
    }
}
