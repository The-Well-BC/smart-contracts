pragma solidity ^0.8.4;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./Admin.sol";

contract TheWellTreasury is WellAdmin {
    uint256 public totalEthRecived;

    // mintfund wallet
    address payable MintFund;

    // well percentage of fees go to this wallet
    address payable WellWallet;

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

    function setFeeWallet(address payable wallet_) external isAdmin {
        WellWallet = wallet_;
    }

    function setMintfundWallet(address payable MintFund_) external isAdmin {
        MintFund = MintFund_;
    }

    function depositTokens(uint256 amount, IERC20 token) public {
        token.transferFrom(msg.sender, address(this), amount);
        emit TokenDeposited(amount, token, msg.sender);
    }

    /**
      * @dev Sends ERC20 or ether to WellWallet and MintFund
      * Can be called by anyone but fees will only be sent to the configured addresses
      * Withdraws The Well fees
      */
    function withdrawFees(uint256 amount, IERC20 token) external {
        // Can only call this function if the WellWallet has been set
        require(WellWallet != address(0));
        require(MintFund != address(0));

        require(amount >= 1000 wei, "invalid amount to be sent");

        uint256 mintFundDonation = (amount * 25) / 1000;

        if(address(token) == ETH) {
            //donate to mintfund
            MintFund.transfer(mintFundDonation);

            // withdraw the rest to the WellWallet address
            payable(msg.sender).transfer(amount - mintFundDonation);
        } else {
            // donate to mintfund
            token.transfer(MintFund, mintFundDonation);

            // withdraw the rest to the WellWallet address
            token.transfer(msg.sender, amount - mintFundDonation);
        }

        emit Withdrawal(amount, token);
    }
}
