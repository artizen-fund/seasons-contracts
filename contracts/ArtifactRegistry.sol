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

    struct Project {
        uint256[] tokenID;
        uint256 season;
        string tokenURI;
        address payable projectOwner;
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
    //season => last tokenID
    mapping(uint256 => uint256) public lastTokenIDOfSeason;
    // --------------------------------------------------------------
    // EVENTS
    // --------------------------------------------------------------

    event ProjectCreated(uint256 projectID, address projectOwner);
    event ProjectUpdated(uint256 projectID);
    event ProjectRenewed(uint256 projectID);
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
        projects[projectCount].tokenID.push(tokenToMint);
        projects[projectCount].season = _season;
        projects[projectCount].tokenURI = _tokenURI;
        projects[projectCount].projectOwner = _projectOwner;
        emit ProjectCreated(tokenToMint, _projectOwner);

        return projectCount;
    }

    // function renewProject(
    //   uint256 projectID,
    //   uint256 _season,
    //   string memory _tokenURI,
    //   address _projectOwner
    // ) public onlyOwner {
    //   if (_projectOwner == address(0)) revert ZeroAddressNotAllowed("");
    //   if (seasonClosed[_season]) revert SeasonAlreadyClosed(_season);

    //   uint256 latestTokenID = getLatestTokenID();
    //   uint256 tokenToMint = latestTokenID++;
    //   projects[projectID].tokenIDs.push(tokenToMint);
    //   projects[projectID].seasons.push(_season);
    //   projects[projectID].tokenURIs.push(_tokenURI);
    //   projects[projectID].projectOwners.push(_projectOwner);

    //   emit ProjectRenewed(projectID);
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
        uint projectID,
        uint[] calldata amount
    ) public payable {
        if (msg.value != tokenPrice) revert IncorrectAmount("");
        uint seasonOfProject = projects[projectID].season;
        if (seasonClosed[seasonOfProject])
            revert SeasonAlreadyClosed(seasonOfProject);
        uint[] calldata tokenIDToMint = projects[projectID].tokenID;
        uint latestTokenIDOfSeason = lastTokenIDOfSeason[seasonOfProject];
        if (tokenIDToMint <= latestTokenIDOfSeason)
            revert SeasonAlreadyClosed(seasonOfProject);

        _setURI(projects[projectID].tokenURI);

        splitPrice(projectID, amount);

        if (amount == 1) {
            _mint(msg.sender, tokenIDToMint, 1, "");
            _mint(artizenWallet, tokenIDToMint, 1, "");
            _mint(projects[projectID].projectOwner, tokenIDToMint, 1, "");
        } else {
            _mintBatch(msg.sender, tokenIDToMint, amount, "");
            _mintBatch(artizenWallet, tokenIDToMint, amount, "");
            _mintBatch(
                projects[projectID].projectOwner,
                tokenIDToMint,
                amount,
                ""
            );
        }

        emit ArtifactMinted(msg.sender, tokenIDToMint, amount);
    }

    // --------------------------------------------------------------
    // INTERNAL FUNCTIONS
    // --------------------------------------------------------------

    function splitPrice(uint projectID, uint amountOfTokensBought) internal {
        uint amountOfTokensMinted = amountOfTokensBought * 3;
        uint fullPrice = tokenPrice * amountOfTokensMinted;

        uint splitArtizen = (fullPrice / 100) * artizenSplitPercentage;
        uint splitArtist = fullPrice - splitArtizen;

        artizenWallet.transfer(splitArtizen);

        address payable artistAddress = projects[projectID].projectOwner;
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
}
