// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/* * Contract requirements *
- Minting 3 times of the amount of NFTs
- Fee split on buy
- TokenID is associated with a project
- Start minting from tokenID 123
- Specify mint price
- Minting opened/closed from tokenID to tokenID => closeSeason
*/

contract ArtifactRegistry is ERC1155Upgradeable, OwnableUpgradeable {
    // -------------------------------------------------------------
    // STORAGE
    // --------------------------------------------------------------

    uint256 tokenID = 123;
    uint256 public projectCount; // not sure if we need this
    address payable artizenWallet;
    uint256 tokenPrice;
    bool private isShutdown;

    struct Project {
        uint256[] tokenIDs;
        uint256[] tokebURIs;
        address projectOwner;
    }
    //tokenID => top buyer address
    mapping(uint256 => address) public artifactTopBuyer;
    // season => season topBuyer
    mapping(uint256 => address) public seasonTopBuyer; // need to figure operation out for this one, probably needs a separate funtion to run once at the end of the season

    // tokenID => amount
    mapping(uint256 => uint256) public amontOfTokenSold;
    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------

    event ProjectCreated(uint256 tokenID, address projectOwner);
    event ArtizenWalletAddressSet(address artizenWallet);

    // --------------------------------------------------------------
    // CUSTOM ERRORS
    // --------------------------------------------------------------
    error ZeroAddressNotAllowed(string message);

    // --------------------------------------------------------------
    // CONSTRUCTOR
    // --------------------------------------------------------------

    function initialize() public initializer {}

    // --------------------------------------------------------------
    // STATE-MODIFYING FUNCTIONS
    // --------------------------------------------------------------
    function setDAOWalletAddress(
        address payable _artizenWallet
    ) public onlyOwner {
        if (_artizenWallet == address(0))
            revert ZeroAddressNotAllowed("Cannot set zero address");
        assembly {
            sstore(artizenWallet.slot, _artizenWallet)
        }
        emit ArtizenWalletAddressSet(_artizenWallet);
    }

    function setTokenPrice(uint256 price) public onlyOwner returns (uint256) {
        // TODO
    }
}
