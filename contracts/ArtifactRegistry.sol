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
    address payable artizenWallet;
    uint artizenSplitPercentage;
    uint protocolFeePercentage;
    uint256 public tokenPrice;
    bool private isShutdown;
    uint public latestTokenID;

    uint[] amountsBoughtPerAddress;
    uint[] toptokenIDs;
    address[] topBuyers;

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

    // tokenID => amount
    mapping(uint256 => uint256) public topAmontOfTokenSold;
    // tokenID => amout
    mapping(uint => uint) public totalAmountOfTokensSold;
    // address => tokenID => amount
    mapping(address => mapping(uint => uint)) amountPurchasedPerTokenPerAddress;
    // address => season => amount
    mapping(address => mapping(uint => uint)) totalTokensPurchasedPerAddressPerSeason;
    // tokenID => amount => user
    mapping(uint => mapping(uint => address)) amountOfTokenBoughtPerAddress;
    // amount => tokenIDs
    mapping(uint => uint[]) amountToTokenIDs;

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
    event ProtocolFeePercentageSet(uint percentage);
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

    function setProtocolFeePercentage(uint percentage) public onlyOwner {
        assembly {
            sstore(protocolFeePercentage.slot, percentage)
        }
        emit ProtocolFeePercentageSet(percentage);
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
        if (seasons[_season].endTime < block.timestamp)
            revert NoMoreSubmissionsToThisSeason(_season);

        unchecked {
            submissionCount++;
        }
        uint256 latestTokenID = getLatestTokenID();
        uint256 tokenToMint = latestTokenID++;
        submissions[submissionCount].tokenID.push(tokenToMint);
        submissions[submissionCount].season = _season;
        submissions[submissionCount].tokenURI = _tokenURI;
        submissions[submissionCount].SubmissionOwner = _SubmissionOwner;

        // persist information to season struct

        uint[] storage tokenIDsOfSeason = seasons[_season].tokenIDs;
        tokenIDsOfSeason.push(tokenToMint);

        uint[] storage submissionIDsOfSeason = seasons[_season].submissionIDs;
        submissionIDsOfSeason.push(submissionCount);

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
        uint amountToMint = amount[0];
        uint[] storage tokenIDsToMint = submissions[submissionID].tokenID;
        uint tokenIDToMint = tokenIDsToMint[0];
        if (msg.value != tokenPrice) revert IncorrectAmount("");
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

        amountToTokenIDs[amountToMint].push(tokenIDToMint);

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

    function getTopBuyersOfSeason(
        uint _season
    ) public returns (address[] memory) {
        uint largestAmount = getLargestAmountOfTokensBoughtInSeason(_season);
        uint[] memory topTokenIDs = amountToTokenIDs[largestAmount];

        for (uint i = 0; i < topTokenIDs.length; i++) {
            address buyers = amountOfTokenBoughtPerAddress[largestAmount][
                topTokenIDs[i]
            ];

            topBuyers.push(buyers);
        }
        return topBuyers;
    }

    // --------------------------------------------------------------
    // INTERNAL FUNCTIONS
    // --------------------------------------------------------------

    function splitPrice(uint submissionID, uint amountOfTokensBought) internal {
        uint amountOfTokensMinted = amountOfTokensBought * 3;
        uint fullPrice = tokenPrice * amountOfTokensMinted;

        uint splitArtizen = (fullPrice / 100) * artizenSplitPercentage;
        uint protocolFee = (fullPrice / 100) * protocolFeePercentage;
        uint splitArtist = fullPrice - (splitArtizen + protocolFeePercentage);

        artizenWallet.transfer(splitArtizen);

        address payable artistAddress = submissions[submissionID]
            .SubmissionOwner;
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

    // --------------------------------------------------------------
    // VIEW FUNCTIONS
    // --------------------------------------------------------------

    function getArtizenWalletAddress() public view returns (address wallet) {
        assembly {
            wallet := sload(artizenWallet.slot)
        }
    }

    function getLatestTokenID() public view returns (uint256) {
        return startTokenID + submissionCount;
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

    function getTopSubmissionOfSeason(
        uint seasonID
    ) public view returns (uint) {
        //TODO
        // getTotalAmountOfTokenSold for each token in season, return the highest one then save it into season struct

        uint[] memory submissionIDsOfSeason = seasons[seasonID].submissionIDs;

        for (uint i = 0; i < submissionIDsOfSeason.length; i++) {
            uint totalTokenSales = getTotalTokenSales(submissionIDsOfSeason[i]);
            uint256 largest = 0;
            // for (i = 0; i < amountsBoughtPerAddress.length; i++) {
            //   if (amountsBoughtPerAddress[i] > largest) {
            //     largest = amountsBoughtPerAddress[i];
            //   }
            // }
        }
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

    function getTokenPrice() public view returns (uint price) {
        assembly {
            price := sload(tokenPrice.slot)
        }
    }
}
