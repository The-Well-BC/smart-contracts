pragma solidity ^0.8.4;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Admin.sol";

contract TheWellTreasury is WellAdmin {
    uint256 public totalEthRecived;
    address MintFund;
    address ETH;
    event tokenDeposited(
        uint256 indexed amount,
        IERC20 token,
        address indexed depositor
    );
    event withdrawal(uint256 indexed amount, IERC20 indexed token);
    event receivedEther(uint256 amount, address sender);

constructor(){
    ETH = 0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE;
}
    receive() external {
        totalEthRecived++;
        emit receivedEther(msg.value, msg.sender);
    }

    function depositTokens(uint256 amount, IERC20 token) public {
        token.transferFrom(msg.sender, address(this), amount);
        emit tokenDeposited(amount, token, msg.sender);
    }

    function withdrawTokenOrEth(uint256 amount, IERC20 token) public wellAdmin {
        require(amount >= 1000 wei, "invalid amount to be sent");
        if (token == ETH) {
            //donate to mintfund
            uint256 mintFundDonation = (amount * 25) / 1000;
            MintFund.transfer(mintFundDonation);

            // withdraw the rest to caller
            msg.sender.transfer(amount - mintFundDonation);
            emit withdrawal(amount, token);
        } else {
            //donate to mintfund
            uint256 mintFundDonation = (amount * 25) / 1000;
            token.transfer(MintFund, mintFundDonation);

            // withdraw the rest to caller
            token.transfer(msg.sender, amount - mintFundDonation);
            emit withdrawal(amount, token);
        }
    }
}
