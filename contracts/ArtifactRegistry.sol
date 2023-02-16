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

  uint256 starttokenID = 123;
  uint256 public projectCount; // not sure if we need this
  address payable artizenWallet;
  uint256 tokenPrice;
  bool private isShutdown;

  struct Project {
    uint256[] tokenIDs;
    uint256[] seasons;
    string[] tokenURIs;
    address[] projectOwners;
  }

  // projectID => struct
  mapping(uint256 => Project) projects;
  //tokenID => top buyer address
  mapping(uint256 => address) public artifactTopBuyer;
  // season => season topBuyer
  mapping(uint256 => address) public seasonTopBuyer; // need to figure operation out for this one, probably needs a separate funtion to run once at the end of the season

  // tokenID => amount
  mapping(uint256 => uint256) public amontOfTokenSold;

  // season => bool
  mapping(uint256 => bool) public seasonClosed;
  // --------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------

  event ProjectCreated(uint256 projectID, address projectOwner);
  event ProjectUpdated(uint256 projectID);
  event ProjectRenewed(uint256 projectID);
  event ArtizenWalletAddressSet(address artizenWallet);
  event Shutdown(bool _isShutdown);

  // --------------------------------------------------------------
  // CUSTOM ERRORS
  // --------------------------------------------------------------
  error ZeroAddressNotAllowed(string message);
  error SeasonClosed(uint256 season);

  // --------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------

  function initialize() public initializer {}

  // --------------------------------------------------------------
  // STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------
  function setDAOWalletAddress(address payable _artizenWallet)
    public
    onlyOwner
  {
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

  function setURI(string memory newuri, uint256 tokenID) public onlyOwner {
    //TODO
    _setURI(newuri);
  }

  function shutdown(bool _isShutdown) external {
    isShutdown = _isShutdown;
    emit Shutdown(_isShutdown);
  }

  function createProject(
    uint256 _season,
    string memory _tokenURI,
    address _projectOwner
  ) public onlyOwner returns (uint256) {
    if (_projectOwner == address(0)) revert ZeroAddressNotAllowed("");
    if (seasonClosed[_season]) revert SeasonClosed(_season);

    unchecked {
      projectCount++;
    }
    uint256 latestTokenID = getLatestTokenID();
    uint256 tokenToMint = latestTokenID++;
    projects[projectCount].tokenIDs.push(tokenToMint);
    projects[projectCount].seasons.push(_season);
    projects[projectCount].tokenURIs.push(_tokenURI);
    projects[projectCount].projectOwners.push(_projectOwner);

    emit ProjectCreated(tokenToMint, _projectOwner);

    return projectCount;
  }

  function renewProject(
    uint256 projectID,
    uint256 _season,
    string memory _tokenURI,
    address _projectOwner
  ) public onlyOwner {
    if (_projectOwner == address(0)) revert ZeroAddressNotAllowed("");
    if (seasonClosed[_season]) revert SeasonClosed(_season);

    uint256 latestTokenID = getLatestTokenID();
    uint256 tokenToMint = latestTokenID++;
    projects[projectID].tokenIDs.push(tokenToMint);
    projects[projectID].seasons.push(_season);
    projects[projectID].tokenURIs.push(_tokenURI);
    projects[projectID].projectOwners.push(_projectOwner);

    emit ProjectRenewed(projectID);
  }

  function closeSeason() public onlyOwner {
    //TODO
  }

  function mintArtifact() public payable {
    // TODO
  }

  // --------------------------------------------------------------
  // VIEW FUNCTIONS
  // --------------------------------------------------------------

  function getArtizenWalletAddress() public view returns (address wallet) {
    assembly {
      wallet := sload(artizenWallet.slot)
    }
  }

  function getLatestTokenID() public view returns (uint256) {
    //TODO
  }
}
