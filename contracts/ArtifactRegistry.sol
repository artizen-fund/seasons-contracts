// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/token/ERC1155/ERC1155Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

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

contract ArtifactRegistry is ERC1155Upgradeable, OwnableUpgradeable {
    // -------------------------------------------------------------
    // STORAGE
    // --------------------------------------------------------------

    uint256 startTokenID;
    uint256 public SubmissionCount;
    uint public seasonCount;
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
        address payable SubmissionOwner;
    }

    struct Season {
        uint[] tokenIDs;
        address topBuyer;
        address topSubmission;
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

    //season => last tokenID
    mapping(uint256 => uint256) public lastTokenIDOfSeason;
    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------

    event SubmissionCreated(uint256 submissionID, address SubmissionOwner);
    event SubmissionUpdated(uint256 submissionID);
    event SeasonCreated(uint seasonID);
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
    error ContractShutdown(string message);
    error IncorrectTimesGiven(string message);

    // --------------------------------------------------------------
    // CONSTRUCTOR
    // --------------------------------------------------------------

    function initialize() public initializer {
        startTokenID = 123;
        __ERC1155_init("");
        __Ownable_init();
    }

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
        address payable _SubmissionOwner
    ) public onlyOwner returns (uint256) {
        if (isShutdown) revert ContractShutdown("Contract has been shut down");
        if (_SubmissionOwner == address(0)) revert ZeroAddressNotAllowed("");
        if (seasons[_season].isClosed) revert SeasonAlreadyClosed(_season);

        unchecked {
            SubmissionCount++;
        }
        uint256 latestTokenID = getLatestTokenID();
        uint256 tokenToMint = latestTokenID++;
        submissions[SubmissionCount].tokenID.push(tokenToMint);
        submissions[SubmissionCount].season = _season;
        submissions[SubmissionCount].tokenURI = _tokenURI;
        submissions[SubmissionCount].SubmissionOwner = _SubmissionOwner;

        // persist information to season struct

        uint[] storage tokenIDsOfSeason = seasons[_season].tokenIDs;
        tokenIDsOfSeason.push(tokenToMint);

        emit SubmissionCreated(tokenToMint, _SubmissionOwner);

        return SubmissionCount;
    }

    function createSeason(
        uint startTime,
        uint endTime
    ) public onlyOwner returns (uint) {
        if (startTime > endTime)
            revert IncorrectTimesGiven("Incorrect times given");

        unchecked {
            seasonCount++;
        }

        seasons[seasonCount].startTime;
        seasons[seasonCount].endTime;

        emit SeasonCreated(seasonCount);

        return seasonCount;
    }

    function closeSeason(uint256 _season) public onlyOwner {
        if (seasons[_season].isClosed) revert SeasonAlreadyClosed(_season);

        // return last tokenIDOfSeason

        uint[] memory tokenIDsofSeason = seasons[_season].tokenIDs;
        uint _lastTokenIDofSeason = seasons[_season].tokenIDs[
            tokenIDsofSeason.length
        ];

        seasons[_season].lastTokenIDOfSeason = _lastTokenIDofSeason;
        seasons[_season].isClosed = true;

        emit SeasonClosed(_season);
    }

    function mintArtifact(
        uint submissionID,
        uint[] calldata amount
    ) public payable {
        if (isShutdown) revert ContractShutdown("Contract has been shut down");
        uint amountToMint = amount[0];
        uint[] storage tokenIDsToMint = submissions[submissionID].tokenID;
        uint tokenIDToMint = tokenIDsToMint[0];
        if (msg.value != tokenPrice) revert IncorrectAmount("");
        uint seasonOfSubmission = submissions[submissionID].season;
        if (seasons[seasonOfSubmission].isClosed)
            revert SeasonAlreadyClosed(seasonOfSubmission);

        uint latestTokenIDOfSeason = lastTokenIDOfSeason[seasonOfSubmission];
        if (tokenIDToMint <= latestTokenIDOfSeason)
            revert SeasonAlreadyClosed(seasonOfSubmission);

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
            _mint(
                submissions[submissionID].SubmissionOwner,
                tokenIDToMint,
                1,
                ""
            );
        } else {
            _mintBatch(msg.sender, tokenIDsToMint, amount, "");
            _mintBatch(artizenWallet, tokenIDsToMint, amount, "");
            _mintBatch(
                submissions[submissionID].SubmissionOwner,
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

        address payable artistAddress = submissions[submissionID]
            .SubmissionOwner;
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
        return startTokenID + SubmissionCount;
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

    function getTopSubmissionOfSeason(
        uint seasonID
    ) public view returns (address) {}

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

    function getTokenPrice() public view returns (uint price) {
        assembly {
            price := sload(tokenPrice.slot)
        }
    }
}
