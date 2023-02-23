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

  uint256 startTokenID = 123;
  uint256 public projectCount; // not sure if we need this
  address payable artizenWallet;
  uint public artizenSplitPercentage;
  uint256 public tokenPrice;
  bool private isShutdown;
  uint public latestTokenID;

  // TODO rename it to Submission
  struct Submission {
    uint256[] tokenID;
    uint256 season;
    string tokenURI;
    address payable projectOwner;
  }

  // submissionID => struct
  mapping(uint256 => Submission) submissions;
  //tokenID => top buyer address
  mapping(uint256 => address) public artifactTopBuyer;
  // season => season topBuyer
  mapping(uint256 => address) public seasonTopBuyer; // need to figure operation out for this one, probably needs a separate funtion to run once at the end of the season

  // tokenID => amount
  mapping(uint256 => uint256) public topAmontOfTokenSold;
  mapping(uint => uint) public totalAmountOfTokensSold;
  // address => tokenID => amount
  mapping(address => mapping(uint => uint))
    public amountPurchasedPerTokenPerAddress;
  // address => season => amount
  mapping(address => mapping(uint => uint))
    public totalTokensPurchasedPerAddressPerSeason;

  // season => bool
  mapping(uint256 => bool) public seasonClosed;
  //season => last tokenID
  mapping(uint256 => uint256) public lastTokenIDOfSeason;
  // --------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------

  event ProjectCreated(uint256 submissionID, address projectOwner);
  event ProjectUpdated(uint256 submissionID);
  event ProjectRenewed(uint256 submissionID);
  event ArtizenWalletAddressSet(address artizenWallet);
  event SeasonClosed(uint256 _season);
  event TokenPriceSet(uint price);
  event Shutdown(bool _isShutdown);
  event ArtizenFeeSplitPercentageSet(uint percentage);
  event ArtifactMinted(address to, uint tokenID, uint amount);

  // --------------------------------------------------------------
  // CUSTOM ERRORS
  // --------------------------------------------------------------
  error ZeroAddressNotAllowed(string message);
  error SeasonAlreadyClosed(uint256 season);
  error IncorrectAmount(string message);

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
    assembly {
      sstore(tokenPrice.slot, price)
    }
    emit TokenPriceSet(price);
  }

  function setArtizenFeeSplitPercentage(uint percentage) public onlyOwner {
    assembly {
      sstore(artizenSplitPercentage.slot, percentage)
    }
    emit ArtizenFeeSplitPercentageSet(percentage);
  }

  function shutdown(bool _isShutdown) external {
    isShutdown = _isShutdown;
    emit Shutdown(_isShutdown);
  }

  function createSubmisson(
    uint256 _season,
    string memory _tokenURI,
    address payable _projectOwner
  ) public onlyOwner returns (uint256) {
    if (_projectOwner == address(0)) revert ZeroAddressNotAllowed("");
    if (seasonClosed[_season]) revert SeasonAlreadyClosed(_season);

    unchecked {
      projectCount++;
    }
    uint256 latestTokenID = getLatestTokenID();
    uint256 tokenToMint = latestTokenID++;
    submissions[projectCount].tokenID.push(tokenToMint);
    submissions[projectCount].season = _season;
    submissions[projectCount].tokenURI = _tokenURI;
    submissions[projectCount].projectOwner = _projectOwner;
    emit ProjectCreated(tokenToMint, _projectOwner);

    return projectCount;
  }

  function closeSeason(
    uint256 _season,
    uint256 _lastTokenIDOfSeason
  ) public onlyOwner {
    if (seasonClosed[_season]) revert SeasonAlreadyClosed(_season);

    lastTokenIDOfSeason[_season] = _lastTokenIDOfSeason;
    seasonClosed[_season];

    emit SeasonClosed(_season);
  }

  function mintArtifact(
    uint submissionID,
    uint[] calldata amount
  ) public payable {
    uint amountToMint = amount[0];
    uint[] storage tokenIDsToMint = submissions[submissionID].tokenID;
    uint tokenIDToMint = tokenIDsToMint[0];
    if (msg.value != tokenPrice) revert IncorrectAmount("");
    uint seasonOfProject = submissions[submissionID].season;
    if (seasonClosed[seasonOfProject])
      revert SeasonAlreadyClosed(seasonOfProject);

    uint latestTokenIDOfSeason = lastTokenIDOfSeason[seasonOfProject];
    if (tokenIDToMint <= latestTokenIDOfSeason)
      revert SeasonAlreadyClosed(seasonOfProject);

    totalTokensPurchasedPerAddressPerSeason[msg.sender][
      submissions[submissionID].season
    ] += amountToMint;

    totalAmountOfTokensSold[tokenIDToMint] += amountToMint;

    // register top buyer
    if (
      // amounts purchased per address
      topAmontOfTokenSold[tokenIDToMint] < amountToMint
    ) {
      artifactTopBuyer[tokenIDToMint] = msg.sender;
      topAmontOfTokenSold[tokenIDToMint] = amountToMint;
    }

    _setURI(submissions[submissionID].tokenURI);

    splitPrice(submissionID, amountToMint);

    if (amountToMint == 1) {
      _mint(msg.sender, tokenIDToMint, 1, "");
      _mint(artizenWallet, tokenIDToMint, 1, "");
      _mint(submissions[submissionID].projectOwner, tokenIDToMint, 1, "");
    } else {
      _mintBatch(msg.sender, tokenIDsToMint, amount, "");
      _mintBatch(artizenWallet, tokenIDsToMint, amount, "");
      _mintBatch(
        submissions[submissionID].projectOwner,
        tokenIDsToMint,
        amount,
        ""
      );
    }

    emit ArtifactMinted(msg.sender, tokenIDToMint, amountToMint);
  }

  // --------------------------------------------------------------
  // INTERNAL FUNCTIONS
  // --------------------------------------------------------------

  function splitPrice(uint submissionID, uint amountOfTokensBought) internal {
    uint amountOfTokensMinted = amountOfTokensBought * 3;
    uint fullPrice = tokenPrice * amountOfTokensMinted;

    uint splitArtizen = (fullPrice / 100) * artizenSplitPercentage;
    uint splitArtist = fullPrice - splitArtizen;

    artizenWallet.transfer(splitArtizen);

    address payable artistAddress = submissions[submissionID].projectOwner;
    artistAddress.transfer(splitArtist);
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
    return startTokenID + projectCount;
  }

  function getTopBuyerOfSeason(uint _season) public view returns (address) {
    uint lastTokenID = lastTokenIDOfSeason[_season];

    for (uint i = 123; i < lastTokenID; i++) {
      getTopBuyer(_season);
    }
  }

  function getTotalTokenSales(uint submissionID) public view returns (uint) {
    uint[] memory tokenID = submissions[submissionID].tokenID;
    uint tokenIDToCheck = tokenID[0];

    return totalAmountOfTokensSold[tokenIDToCheck];
  }

  function getTopBuyer(uint submissionID) public view returns (address) {
    uint[] memory tokenID = submissions[submissionID].tokenID;
    uint tokenIDToCheck = tokenID[0];

    return artifactTopBuyer[tokenIDToCheck];
  }

  function getDAOWalletAddress() public view returns (address wallet) {
    assembly {
      wallet := sload(artizenWallet.slot)
    }
  }

  function getSplitPercentage() public view returns (uint percentage) {
    assembly {
      percentage := sload(artizenSplitPercentage.slot)
    }
  }
}
