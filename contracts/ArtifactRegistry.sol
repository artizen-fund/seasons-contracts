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
    uint[] toptokenIDs;
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
        address[] topBuyers;
        uint[] topSubmissions;
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
    mapping(uint => mapping(uint => address)) amountOfTokenBoughtPerAddress;
    // amount => season => tokenIDs
    mapping(uint => mapping(uint => uint[])) amountToTokenIDsOfSeason;

    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------

    event SubmissionCreated(uint256 submissionID, address SubmissionOwner);
    event SubmissionUpdated(uint256 submissionID);
    event SeasonCreated(uint seasonID);
    event protocolWalletAddressSet(address protocolWallet);
    event SeasonClosed(uint256 _season);
    event TokenPriceSet(uint price);
    event Shutdown(bool _isShutdown);
    event ArtizenFeeSplitPercentageSet(uint percentage);
    event ArtistFeePercentageSet(uint percentage);
    event ArtifactMinted(address to, uint tokenID, uint amount);

    // --------------------------------------------------------------
    // CUSTOM ERRORS
    // --------------------------------------------------------------
    error ZeroAddressNotAllowed(string message);
    error SeasonAlreadyClosed(uint256 season);
    error NoMoreSubmissionsToThisSeason(uint256 season);
    error IncorrectAmount(string message);
    error ContractShutdown(string message);
    error IncorrectTimesGiven(string message);

    // --------------------------------------------------------------
    // CONSTRUCTOR
    // --------------------------------------------------------------

    function initialize() public initializer {
        startTokenID = 123;
        submissionCount = 123;
        __ERC1155_init("");
        __Ownable_init();
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
        emit protocolWalletAddressSet(_treasuryWallet);
    }

    function setProtocolWalletAddress(
        address payable _protocolWallet
    ) public onlyOwner {
        if (_protocolWallet == address(0))
            revert ZeroAddressNotAllowed("Cannot set zero address");
        assembly {
            sstore(protocolWallet.slot, _protocolWallet)
        }
        emit protocolWalletAddressSet(_protocolWallet);
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
        emit ArtizenFeeSplitPercentageSet(percentage);
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

    function createSubmission(
        uint256 _season,
        string memory _tokenURI,
        address payable _SubmissionOwner
    ) public onlyOwner returns (uint256) {
        if (isShutdown) revert ContractShutdown("Contract has been shut down");
        if (_SubmissionOwner == address(0)) revert ZeroAddressNotAllowed("");
        if (seasons[_season].isClosed) revert SeasonAlreadyClosed(_season);
        // if (seasons[_season].endTime < block.timestamp)
        //   revert NoMoreSubmissionsToThisSeason(_season);

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

    function closeSeason(uint256 _season) public onlyOwner {
        if (seasons[_season].isClosed) revert SeasonAlreadyClosed(_season);

        // return last tokenIDOfSeason

        uint[] memory tokenIDsofSeason = seasons[_season].tokenIDs;
        uint _lastTokenIDofSeason = seasons[_season].tokenIDs[
            tokenIDsofSeason.length - 1
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
        uint amountToMint = amount[0] * 3;
        uint[] storage tokenIDsToMint = submissions[submissionID].tokenID;
        uint tokenIDToMint = tokenIDsToMint[0];
        if (msg.value != tokenPrice * amountToMint) revert IncorrectAmount("");
        uint seasonOfSubmission = submissions[submissionID].season;
        if (seasons[seasonOfSubmission].isClosed)
            revert SeasonAlreadyClosed(seasonOfSubmission);

        uint latestTokenIDOfSeason = seasons[seasonOfSubmission]
            .lastTokenIDOfSeason;
        if (tokenIDToMint <= latestTokenIDOfSeason)
            revert SeasonAlreadyClosed(seasonOfSubmission);

        totalTokensPurchasedPerAddressPerSeason[msg.sender][
            submissions[submissionID].season
        ] += amountToMint;

        totalAmountOfTokensSold[tokenIDToMint] += amountToMint;

        // TODO double check this
        amountOfTokenBoughtPerAddress[tokenIDToMint][amountToMint] = msg.sender;

        amountToTokenIDsOfSeason[submissions[submissionID].season][amountToMint]
            .push(tokenIDToMint);

        // register top buyer
        if (
            // amounts purchased per address
            topAmontOfTokenSold[tokenIDToMint] < amountToMint
        ) {
            artifactTopBuyer[tokenIDToMint] = msg.sender;
            topAmontOfTokenSold[tokenIDToMint] = amountToMint;
        }

        _setURI(submissions[submissionID].tokenURI);

        if (amountToMint == 1) {
            _mint(msg.sender, tokenIDToMint, 1, "");
            _mint(protocolWallet, tokenIDToMint, 1, "");
            _mint(
                submissions[submissionID].SubmissionOwner,
                tokenIDToMint,
                1,
                ""
            );
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

        // uint splitArtist = (msg.value / 100) * 80;
        // uint splitArtizen = (msg.value / 100) * 10;
        // address payable artistAddress = submissions[submissionID]
        //     .SubmissionOwner;
        // artistAddress.transfer(splitArtist);
        // treasuryWallet.transfer(splitArtizen);

        splitPrice(submissionID, msg.value);

        emit ArtifactMinted(msg.sender, tokenIDToMint, amountToMint);
    }

    function getTopBuyersOfSeason(
        uint _seasonID
    ) public returns (address[] memory) {
        uint largestAmount = getLargestAmountOfTokensBoughtInSeason(_seasonID);
        uint[] memory topTokenIDs = amountToTokenIDsOfSeason[_seasonID][
            largestAmount
        ];

        for (uint i = 0; i < topTokenIDs.length; i++) {
            address buyers = amountOfTokenBoughtPerAddress[largestAmount][
                topTokenIDs[i]
            ];

            seasons[_seasonID].topBuyers.push(buyers);
        }
        return seasons[_seasonID].topBuyers;
    }

    function getTopSubmissionsOfSeason(
        uint _seasonID
    ) public returns (uint[] memory topSubmissions) {
        uint largestAmount = getLargestAmountOfTokensSoldInSeason(_seasonID);
        uint[] memory topTokenIDs = amountToTokenIDsOfSeason[_seasonID][
            largestAmount
        ];

        return topSubmissions = seasons[_seasonID].topSubmissions = topTokenIDs;
    }

    function withdrawProtocolFees(address payable account) public onlyOwner {
        account.transfer(address(this).balance);
    }

    // --------------------------------------------------------------
    // INTERNAL FUNCTIONS
    // --------------------------------------------------------------

    function splitPrice(uint submissionID, uint value) internal {
        uint splitTreasury = (value / 100) * treasurySplitPercentage;
        uint splitArtist = (value / 100) * artistFeePercentage;

        address payable artistAddress = submissions[submissionID]
            .SubmissionOwner;
        treasuryWallet.transfer(splitTreasury);
        artistAddress.transfer(splitArtist);
    }

    function getLargestAmountOfTokensBoughtInSeason(
        uint _season
    ) internal returns (uint) {
        uint256 largest = 0;
        uint[] memory tokenIDs = seasons[_season].tokenIDs;
        uint fistTokenID = tokenIDs[0];
        uint lastTokenID = tokenIDs[tokenIDs.length - 1];

        for (uint i = fistTokenID; i < lastTokenID; i++) {
            // get top buyer per artifact
            address topBuyers = getTopBuyerPerArtifact(tokenIDs[i]);
            // get full amount of tokens bought during the season
            uint amoutBought = getTotalTokensPurchasedPerAddressInSeason(
                topBuyers,
                _season
            );

            amountsBoughtPerAddress.push(amoutBought);

            for (i = 0; i < amountsBoughtPerAddress.length; i++) {
                if (amountsBoughtPerAddress[i] > largest) {
                    largest = amountsBoughtPerAddress[i];
                }
            }
        }
        return largest;
    }

    function getLargestAmountOfTokensSoldInSeason(
        uint _season
    ) internal returns (uint) {
        // need each tokenID in season
        // total amout of tokens sold
        // largest amount
        uint256 largest = 0;
        uint[] memory submissionIDs = seasons[_season].submissionIDs;

        for (uint i = 0; i < submissionIDs.length; i++) {
            uint totalTokenSales = getTotalTokenSales(submissionIDs[i]);

            totalSalesOfTokenIDs.push(totalTokenSales);
            for (i = 0; i < totalSalesOfTokenIDs.length; i++) {
                if (totalSalesOfTokenIDs[i] > largest) {
                    largest = totalSalesOfTokenIDs[i];
                }
            }
        }
        return largest;
    }

    // --------------------------------------------------------------
    // VIEW FUNCTIONS
    // --------------------------------------------------------------

    function getSeason(uint seasonID) public view returns (Season memory) {
        return seasons[seasonID];
    }

    function getSubmission(
        uint submissionID
    ) public view returns (Submission memory) {
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
        // TODO
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
        uint[] memory tokenID = submissions[submissionID].tokenID;
        uint tokenIDToCheck = tokenID[0];

        return artifactTopBuyer[tokenIDToCheck];
    }

    function getTotalTokensPurchasedPerAddressInSeason(
        address buyer,
        uint season
    ) public view returns (uint) {
        return totalTokensPurchasedPerAddressPerSeason[buyer][season];
    }

    function getAddressOfAmountBoughtPerToken(
        uint tokenID,
        uint amount
    ) public view returns (address) {
        return amountOfTokenBoughtPerAddress[tokenID][amount];
    }

    function getProtocolWalletAddress() public view returns (address wallet) {
        assembly {
            wallet := sload(protocolWallet.slot)
        }
    }

    function getTreasurySplitPercentage()
        public
        view
        returns (uint percentage)
    {
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
}
