pragma solidity ^0.8.4;
import '../Admin.sol';
import {TheWellNFT} from "../theWellNFT.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract AdminTester is WellAdmin {
    function adminTestFn() public view isAdmin returns(bool) {
        return true;
    }
    function superAdminTestFn() public view isSuperAdmin returns(bool) {
        return true;
    }
    function sellNFT(address nftContract, uint256 tokenId) external {
        address _previousOwner = IERC721(nftContract).ownerOf(tokenId);

        TheWellNFT(nftContract).safeTransferFrom(
            _previousOwner,
            msg.sender,
            tokenId
        );
    }
}
