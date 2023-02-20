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
    // address => tokenID => amount
    mapping(address => mapping(uint => uint))
        public amountPurchasedPerTokenPerAddress;
    // address => season => amount
    mapping(address => mapping(uint => uint))
        public totalPurchasedPerAddressPerSeason;

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

    function createProject(
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

    // function renewProject(
    //   uint256 submissionID,
    //   uint256 _season,
    //   string memory _tokenURI,
    //   address _projectOwner
    // ) public onlyOwner {
    //   if (_projectOwner == address(0)) revert ZeroAddressNotAllowed("");
    //   if (seasonClosed[_season]) revert SeasonAlreadyClosed(_season);

    //   uint256 latestTokenID = getLatestTokenID();
    //   uint256 tokenToMint = latestTokenID++;
    //   submissions[submissionID].tokenIDs.push(tokenToMint);
    //   submissions[submissionID].seasons.push(_season);
    //   submissions[submissionID].tokenURIs.push(_tokenURI);
    //   submissions[submissionID].projectOwners.push(_projectOwner);

    //   emit ProjectRenewed(submissionID);
    // }

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

        // register top buyer

        if (
            // amounts purchased per address
            topAmontOfTokenSold[tokenIDToMint] <
            amountPurchasedPerTokenPerAddress[msg.sender][tokenIDToMint]
        ) {
            artifactTopBuyer[tokenIDToMint] = msg.sender;
            topAmontOfTokenSold[tokenIDToMint] = amountToMint * 3;
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

    function getTopBuyerOfSeason(uint season) public view returns (address) {
        //TODO
    }
}
