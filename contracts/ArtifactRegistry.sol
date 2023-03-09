// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC1155/extensions/ERC1155URIStorageUpgradeable.sol";

/* * Contract requirements *
- Minting 3 times of the amount of NFTs 
- Fee split on buy
- TokenID is associated with a Submission
- Start minting from tokenID 123
- Specify mint price
- Minting opened/closed from tokenID to tokenID => closeSeason
- Top Submission of the season calculation
- Add season struct record timestamps, try to close season by timestamp
*/

contract ArtifactRegistry is
  ERC1155Upgradeable,
  OwnableUpgradeable,
  ERC1155URIStorageUpgradeable
{
  // -------------------------------------------------------------
  // STORAGE
  // --------------------------------------------------------------

  uint256 startTokenID;
  uint256 public submissionCount;
  uint public seasonCount;
  address payable protocolWallet;
  address payable treasuryWallet;
  uint treasurySplitPercentage;
  uint artistFeePercentage;
  uint256 public tokenPrice;
  bool private isShutdown;
  uint public latestTokenID;

  uint[] amountsBoughtPerAddress;
  uint[] totalSalesOfTokenIDs;

  // TODO rename it to Submission
  struct Submission {
    uint256[] tokenID;
    uint256 season;
    string tokenURI;
    address payable SubmissionOwner;
  }

  struct Season {
    uint[] submissionIDs;
    uint[] tokenIDs;
    uint[] topSubmissions;
    address topBuyers;
    uint startTime;
    uint endTime;
    uint lastTokenIDOfSeason;
    bool isClosed;
  }

  mapping(uint => Season) seasons;
  // submissionID => struct
  mapping(uint256 => Submission) submissions;
  //tokenID => top buyer address
  mapping(uint256 => address) public artifactTopBuyer;

  // tokenID => amount
  mapping(uint256 => uint256) public topAmontOfTokenSold;
  // tokenID => amout
  mapping(uint => uint) public totalAmountOfTokensSold;

  // address => season => amount
  mapping(address => mapping(uint => uint)) totalTokensPurchasedPerAddressPerSeason;
  // tokenID => amount => user
  // mapping(uint => mapping(uint => address)) amountOfTokenBoughtPerAddress;
  // season => amount => tokenIDs
  mapping(uint => mapping(uint => uint[])) amountToTokenIDsOfSeason;

  // --------------------------------------------------------------
  // EVENTS
  // --------------------------------------------------------------

  event SubmissionCreated(uint256 submissionID, address SubmissionOwner);
  event SeasonCreated(uint seasonID);
  event ProtocolWalletAddressSet(address protocolWallet);
  event SeasonClosed(uint256 _season);
  event TokenPriceSet(uint price);
  event Shutdown(bool _isShutdown);
  event TreasuryFeeSplitPercentageSet(uint percentage);
  event ArtistFeePercentageSet(uint percentage);
  event ArtifactMinted(address to, uint tokenID, uint amount);
  event FeesWithdrawn(uint balance);

  // --------------------------------------------------------------
  // CUSTOM ERRORS
  // --------------------------------------------------------------
  error ZeroAddressNotAllowed(string message);
  error SeasonAlreadyClosed(uint256 season);
  error NoMoreSubmissionsToThisSeason(uint256 season);
  error IncorrectAmount(string message);
  error ContractShutdown(string message);
  error IncorrectTimesGiven(string message);
  error SeasonDoesntExist();
  error SubmissionDoesntExist();

  // --------------------------------------------------------------
  // CONSTRUCTOR
  // --------------------------------------------------------------

  function initialize() public initializer {
    startTokenID = 123;
    submissionCount = 123;
    __ERC1155_init("");
    __Ownable_init();
    __ERC1155URIStorage_init();
  }

  // --------------------------------------------------------------
  // STATE-MODIFYING FUNCTIONS
  // --------------------------------------------------------------
  function setTreasuryAddress(
    address payable _treasuryWallet
  ) public onlyOwner {
    if (_treasuryWallet == address(0))
      revert ZeroAddressNotAllowed("Cannot set zero address");
    assembly {
      sstore(treasuryWallet.slot, _treasuryWallet)
    }
    emit ProtocolWalletAddressSet(_treasuryWallet);
  }

  function setProtocolWalletAddress(
    address payable _protocolWallet
  ) public onlyOwner {
    if (_protocolWallet == address(0))
      revert ZeroAddressNotAllowed("Cannot set zero address");
    assembly {
      sstore(protocolWallet.slot, _protocolWallet)
    }
    emit ProtocolWalletAddressSet(_protocolWallet);
  }

  function setTokenPrice(uint256 price) public onlyOwner returns (uint256) {
    assembly {
      sstore(tokenPrice.slot, price)
    }
    emit TokenPriceSet(price);
  }

  function setTreasurySplitPercentage(uint percentage) public onlyOwner {
    assembly {
      sstore(treasurySplitPercentage.slot, percentage)
    }
    emit TreasuryFeeSplitPercentageSet(percentage);
  }

  function setArtistFeePercentage(uint percentage) public onlyOwner {
    assembly {
      sstore(artistFeePercentage.slot, percentage)
    }
    emit ArtistFeePercentageSet(percentage);
  }

  function shutdown(bool _isShutdown) external {
    isShutdown = _isShutdown;
    emit Shutdown(_isShutdown);
  }

  function createSeason(
    uint startTime,
    uint endTime
  ) public onlyOwner returns (uint) {
    if (isShutdown) revert ContractShutdown("Contract has been shut down");
    if (startTime > endTime)
      revert IncorrectTimesGiven("Incorrect times given");

    unchecked {
      seasonCount++;
    }

    seasons[seasonCount].startTime = startTime;
    seasons[seasonCount].endTime = endTime;

    emit SeasonCreated(seasonCount);

    return seasonCount;
  }

  function createSubmission(
    uint256 _season,
    string memory _tokenURI,
    address payable _SubmissionOwner
  ) public onlyOwner returns (uint256) {
    if (_season > seasonCount) revert SeasonDoesntExist();
    if (isShutdown) revert ContractShutdown("Contract has been shut down");
    if (_SubmissionOwner == address(0)) revert ZeroAddressNotAllowed("");
    if (seasons[_season].endTime < block.timestamp)
      revert NoMoreSubmissionsToThisSeason(_season);
    if (seasons[_season].isClosed) revert SeasonAlreadyClosed(_season);

    unchecked {
      submissionCount++;
    }

    uint[] storage submissionIDsOfSeason = seasons[_season].submissionIDs;
    submissionIDsOfSeason.push(submissionCount);

    uint256 latestTokenID = getLatestTokenID(_season);
    uint256 tokenToMint = latestTokenID++;
    submissions[submissionCount].tokenID.push(tokenToMint);
    submissions[submissionCount].season = _season;
    submissions[submissionCount].tokenURI = _tokenURI;
    submissions[submissionCount].SubmissionOwner = _SubmissionOwner;

    // persist information to season struct

    uint[] storage tokenIDsOfSeason = seasons[_season].tokenIDs;
    tokenIDsOfSeason.push(tokenToMint);

    emit SubmissionCreated(tokenToMint, _SubmissionOwner);

    return submissionCount;
  }

  function closeSeason(uint256 _season) public onlyOwner {
    if (_season > seasonCount) revert SeasonDoesntExist();
    if (seasons[_season].isClosed) revert SeasonAlreadyClosed(_season);

    // return last tokenIDOfSeason

    uint[] memory tokenIDsofSeason = seasons[_season].tokenIDs;
    uint _lastTokenIDofSeason = seasons[_season].tokenIDs[
      tokenIDsofSeason.length - 1
    ];

    seasons[_season].lastTokenIDOfSeason = _lastTokenIDofSeason;
    seasons[_season].isClosed = true;

    withdrawProtocolFees();
    emit SeasonClosed(_season);
  }

  function mintArtifact(
    uint submissionID,
    uint[] calldata amount
  ) public payable {
    if (isShutdown) revert ContractShutdown("Contract has been shut down");
    if (submissionID > submissionCount) revert SubmissionDoesntExist();
    uint amountToMint = amount[0] * 3;
    uint amountSold = amount[0];
    uint[] storage tokenIDsToMint = submissions[submissionID].tokenID;
    uint tokenIDToMint = tokenIDsToMint[0];
    if (msg.value != tokenPrice * amountSold) revert IncorrectAmount("");
    uint seasonOfSubmission = submissions[submissionID].season;
    if (seasons[seasonOfSubmission].isClosed)
      revert SeasonAlreadyClosed(seasonOfSubmission);

    uint latestTokenIDOfSeason = seasons[seasonOfSubmission]
      .lastTokenIDOfSeason;
    if (tokenIDToMint <= latestTokenIDOfSeason)
      revert SeasonAlreadyClosed(seasonOfSubmission);

    totalTokensPurchasedPerAddressPerSeason[msg.sender][
      submissions[submissionID].season
    ] += amountSold;

    totalAmountOfTokensSold[tokenIDToMint] += amountSold;

    // amountOfTokenBoughtPerAddress[tokenIDToMint][amountSold] = msg.sender;

    amountToTokenIDsOfSeason[submissions[submissionID].season][amountSold].push(
      tokenIDToMint
    );

    // register top buyer
    if (
      // amounts purchased per address
      topAmontOfTokenSold[tokenIDToMint] < amountSold
    ) {
      artifactTopBuyer[tokenIDToMint] = msg.sender;
      topAmontOfTokenSold[tokenIDToMint] = amountSold;
    }

    _setURI(tokenIDToMint, submissions[submissionID].tokenURI);

    if (amountToMint == 1) {
      _mint(msg.sender, tokenIDToMint, 1, "");
      _mint(protocolWallet, tokenIDToMint, 1, "");
      _mint(submissions[submissionID].SubmissionOwner, tokenIDToMint, 1, "");
    } else {
      _mintBatch(msg.sender, tokenIDsToMint, amount, "");
      _mintBatch(protocolWallet, tokenIDsToMint, amount, "");
      _mintBatch(
        submissions[submissionID].SubmissionOwner,
        tokenIDsToMint,
        amount,
        ""
      );
    }

    splitPrice(submissionID, msg.value);

    emit ArtifactMinted(msg.sender, tokenIDToMint, amountToMint);
  }

  // function calculateTopBuyerOfSeason(uint seasonID) public onlyOwner {
  //   setAmountOfTokensBoughtInSeason(seasonID);
  //   setTopBuyersOfSeason(seasonID);
  // }

  // step 3. - top buyer ( includes step 2)
  // function setTopBuyersOfSeason(uint _seasonID) public returns (address) {
  //   uint largestAmount = getLargestAmountOfTokensBoughtInSeason(_seasonID);
  // }

  function calculateTopSubmissionsOfSeason(uint _seasonID) public onlyOwner {
    if (_seasonID > seasonCount) revert SeasonDoesntExist();
    setTotalSalesOfTokenIDs(_seasonID);
    setTopSubmissionsOfSeason(_seasonID);
  }

  function setTopSubmissionsOfSeason(uint _seasonID) public onlyOwner {
    uint largestAmount = getLargestAmountOfTokensSoldInSeason(_seasonID);

    uint[] memory IDs = getAmountToTokenIDsOfSeason(_seasonID, largestAmount);
    for (uint i = 0; i < IDs.length; i++) {
      seasons[_seasonID].topSubmissions.push(IDs[i]);
    }
  }

  function withdrawProtocolFees() public onlyOwner {
    protocolWallet.transfer(address(this).balance);

    emit FeesWithdrawn(address(this).balance);
  }

  // --------------------------------------------------------------
  // INTERNAL FUNCTIONS
  // --------------------------------------------------------------

  function splitPrice(uint submissionID, uint value) internal {
    uint splitTreasury = (value / 100) * treasurySplitPercentage;
    uint splitArtist = (value / 100) * artistFeePercentage;

    address payable artistAddress = submissions[submissionID].SubmissionOwner;
    treasuryWallet.transfer(splitTreasury);
    artistAddress.transfer(splitArtist);
  }

  // step 1.
  // function setAmountOfTokensBoughtInSeason(uint _season) public returns (uint) {
  //   uint[] memory tokenIDs = seasons[_season].tokenIDs;

  //   for (uint i = 0; i < tokenIDs.length; i++) {
  //     // get top buyer per artifact
  //     address topBuyers = getTopBuyerPerArtifact(tokenIDs[i]);
  //     // get full amount of tokens bought during the season
  //     uint amoutBought = getTotalTokensPurchasedPerAddressInSeason(
  //       topBuyers,
  //       _season
  //     );

  //     amountsBoughtPerAddress.push(amoutBought);
  //   }
  // }

  // // step 2. - top buyer
  // function getLargestAmountOfTokensPurchasedInSeason(
  //   uint season
  // ) public view returns (uint) {
  //   uint256 largest = 0;
  //   for (uint i = 0; i < amountsBoughtPerAddress.length; i++) {
  //     if (amountsBoughtPerAddress[i] > largest) {
  //       largest = amountsBoughtPerAddress[i];
  //     }
  //   }
  //   return largest;
  // }

  // Step 1 TOP submission - creating array of all number of sales per token per season
  function setTotalSalesOfTokenIDs(uint _season) internal {
    uint[] memory submissionIDs = seasons[_season].submissionIDs;

    for (uint i = 0; i < submissionIDs.length; i++) {
      uint totalTokenSales = getTotalTokenSales(submissionIDs[i]);

      totalSalesOfTokenIDs.push(totalTokenSales);
    }
  }

  // Step 2 - returning largest amount sold in season , make this internal
  function getLargestAmountOfTokensSoldInSeason(
    uint _season
  ) internal view returns (uint) {
    // need each tokenID in season
    // total amout of tokens sold
    // largest amount
    uint256 largest = 0;

    for (uint i = 0; i < totalSalesOfTokenIDs.length; i++) {
      if (totalSalesOfTokenIDs[i] > largest) {
        largest = totalSalesOfTokenIDs[i];
      }
    }
    return largest;
  }

  function getAmountToTokenIDsOfSeason(
    uint seasonID,
    uint amount
  ) public view returns (uint[] memory) {
    if (seasonID > seasonCount) revert SeasonDoesntExist();
    return amountToTokenIDsOfSeason[seasonID][amount];
  }

  // --------------------------------------------------------------
  // VIEW FUNCTIONS
  // --------------------------------------------------------------

  function getSeason(uint seasonID) public view returns (Season memory) {
    if (seasonID > seasonCount) revert SeasonDoesntExist();
    return seasons[seasonID];
  }

  function getSubmission(
    uint submissionID
  ) public view returns (Submission memory) {
    if (submissionID > submissionCount) revert SubmissionDoesntExist();
    return submissions[submissionID];
  }

  function getprotocolWalletAddress() public view returns (address wallet) {
    assembly {
      wallet := sload(protocolWallet.slot)
    }
  }

  function getLatestTokenID(
    uint seasonID
  ) public view returns (uint256 lastTokenID) {
    if (seasonID > seasonCount) revert SeasonDoesntExist();
    uint[] memory allTokenIDs = seasons[seasonID].submissionIDs;
    lastTokenID = allTokenIDs[allTokenIDs.length - 1];
  }

  function getTotalTokenSales(uint submissionID) public view returns (uint) {
    uint[] memory tokenID = submissions[submissionID].tokenID;
    uint tokenIDToCheck = tokenID[0];

    return totalAmountOfTokensSold[tokenIDToCheck];
  }

  function getTopBuyerPerArtifact(
    uint submissionID
  ) public view returns (address) {
    if (submissionID > submissionCount) revert SubmissionDoesntExist();
    uint[] memory tokenID = submissions[submissionID].tokenID;
    uint tokenIDToCheck = tokenID[0];

    return artifactTopBuyer[tokenIDToCheck];
  }

  function getTotalTokensPurchasedPerAddressInSeason(
    address buyer,
    uint seasonID
  ) public view returns (uint) {
    if (seasonID > seasonCount) revert SeasonDoesntExist();
    return totalTokensPurchasedPerAddressPerSeason[buyer][seasonID];
  }

  // function getAddressOfAmountBoughtPerToken(
  //   uint tokenID,
  //   uint amount
  // ) public view returns (address) {
  //   return amountOfTokenBoughtPerAddress[tokenID][amount];
  // }

  function getProtocolWalletAddress() public view returns (address wallet) {
    assembly {
      wallet := sload(protocolWallet.slot)
    }
  }

  function getTreasurySplitPercentage() public view returns (uint percentage) {
    assembly {
      percentage := sload(treasurySplitPercentage.slot)
    }
  }

  function getArtistFeePercentage() public view returns (uint percentage) {
    assembly {
      percentage := sload(artistFeePercentage.slot)
    }
  }

  function getTokenPrice() public view returns (uint price) {
    assembly {
      price := sload(tokenPrice.slot)
    }
  }

  function getTopSubmissionsOfSeason(
    uint seasonID
  ) public view returns (uint[] memory) {
    if (seasonID > seasonCount) revert SeasonDoesntExist();
    return seasons[seasonID].topSubmissions;
  }

  function uri(
    uint256 tokenId
  )
    public
    view
    override(ERC1155Upgradeable, ERC1155URIStorageUpgradeable)
    returns (string memory)
  {
    return super.uri(tokenId);
  }
}
