// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.4;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IWellNFT {
    /** @dev Checks if caller is the artist/minter */
    function isMinter(uint256 tokenId, address caller_) external view returns(bool);

    function checkTokenExists(uint256 tokenID) external view returns(bool);

    /**
     * @notice Sets the default WellNFT marketplace.
     */
    function setMarketplaceContract(address _marketplaceContract) external;

    /**
     * @notice adds marketplace contracts that are allowed to trade Well NFTs
     */
    function addApprovedMarketplace(address _otherMarketplace) external;

    /**
     * @notice adds marketplace contracts that are allowed to trade Well NFTs
     */
    function removeApprovedMarketplace(address _otherMarketplace) external;

    function getApprovedMarketplaces() external view returns(address[] memory);

    function setPaymentContract(address _paymentContract) external;

    function getPaymentsContract() external view returns(address paymentContract);

    function setBaseURI(string memory uriTemplate_) external;

    /**
     * @dev Mint function. Creates a new ERC721 token. _artist refers to the address minting the token
     * Will set the token id using nextTokenTracker and iterate nextTokenTracker.
     * Will also set the token URI
     * @param _artistCut Percentage of sales the minter gets.
     * @param collaborators_ Array of other collaborators that contributed to the art.
     * @param collaboratorRewards_ Array of percentage of sale that each collaborator gets.
     */

    function mint(
        uint8 _artistCut,
        address[] calldata collaborators_,
        uint256[] calldata collaboratorRewards_,
        string calldata mediaHash_,
        string calldata metadataHash_
    ) external;

    /**
     * Returns metadata uri for token tokenId
     */
    function tokenURI(uint256 tokenId) external view returns (string memory);

    /**
    * Returns media uri for token
    */
    function tokenMediaURI(uint256 tokenId) external view returns (string memory);

    function lockupPeriodOver(uint256 tokenId_) external view returns(bool);

    /**
    * Returns addresses of creators of token.
    * @param tokenId_ ID of token
    */
    function tokenCreators(uint256 tokenId_) external view returns (address[] memory);

    /**
    * Returns creator share
    * @param tokenId_ ID of token
    * @param creator_ address of creator
    */
    function creatorShare(uint256 tokenId_, address creator_) external view returns (uint256);

    // this function aims to mimic a lock up for the token, where transfers are barred for a period of time after minting
    function setReleaseTime(uint256 tokenID, uint256 _time) external;

    function getTokenReleaseTime(uint256 tokenID) external view returns (uint256);
}
