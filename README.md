# Seasons Smart Contract

This upgradable contract registers the Artizen Seasons and each submission (project) to a season.
The contract allows users to create submissions for different seasons, mint tokens for these submissions, calculate top submissions for each season, and manage fees and royalties.It also mints open edition Artifacts to each submission and has inherited functionalities from the Open Zeppelin ERC1155Upgradeable,OwnableUpgradeable and ERC1155URIStorageUpgradeable contracts.

**Ethereum Mainnet Contract Address:**
0x20CdDf283164ee59742c80AA5CE9b97127f123cE

**Goerli Testnet Contract Address:**
0x362D42D067F7e3632f9876dbe22D9dBcDe5F6f23

Using the testnet contract requires goerli ETH, you can get some from the Goerli Testnet faucet: https://goerlifaucet.com/

## Prerequisites

- Solidity version 0.8.18
- OpenZeppelin Contracts Upgradeable library

## Contract Overview

The Seasons contract is composed of several storage variables, structs, and mappings to manage seasons, submissions, and token sales. It includes functions for initializing the contract, creating seasons and submissions, minting tokens, closing seasons, withdrawing fees, and more.

### Storage Variables

- `startTokenID`: Starting token ID for submissions
- `submissionCount`: Total number of submissions
- `seasonCount`: Total number of seasons
- `protocolWallet`: Address where protocol fees are sent
- `treasuryWallet`: Address where treasury fees are sent
- `treasurySplitPercentage`: Percentage split for treasury fees
- `artistFeePercentage`: Percentage of the token price as artist royalty
- `tokenPrice`: Price of each token
- `isShutdown`: Flag indicating if the contract is shut down
- `latestTokenID`: Latest token ID used for minting

### Structs

- `Submission`: Represents a submission with its token ID, season, token URI, and owner
- `Season`: Represents a season with submission and token IDs, start and end times, last token ID, and closed flag

### Mappings

- `seasons`: Maps season IDs to Season structs
- `submissions`: Maps submission IDs to Submission structs
- `artifactTopBuyer`: Maps token IDs to the address of the top buyer
- `topAmontOfTokenSold`: Maps token IDs to the highest amount purchased by an address
- `totalAmountOfTokensSold`: Maps token IDs to the total amount of tokens sold
- `totalTokensPurchasedPerAddressPerSeason`: Maps addresses and season IDs to the total tokens purchased
- `totalAmountPurchasedPerToken`: Maps addresses and token IDs to the total amount of tokens purchased
- `amountToTokenIDsOfSeason`: Maps season IDs and amounts to arrays of token IDs

## Functions

`function setProtocolWalletAddress(address payable protocolWallet)`

Use this function to set central protocol wallet address after deployment. This wallet will store protocol fees.

- `address payable protocolWallet`: address of Ethereum wallet

`function setTokenPrice(uint256 price)`

Sets the price of a single NFT.

- `uint256 price`: token price in wei

`function shutdown(bool isShutdown)`

This is an emergency function that shuts all main functionalities of the contract.

`function createSeason( uint startTime,uint endTime)`

Creates a season with given details.

- `startTime`: time of the season opening, in unix timestamp
- `endTime`: time of the season closing, in unix timestamp

`function createSubmission(uint256 \_season,string memory \_tokenURI address payable \_submissionOwner)`

Creates a submission with given details.

- `_season`: ID of season
- `_tokenURIaddress`: tokenURI for NFT
- `_submissionOwner`: address of the official

`function closeSeason(uint256 \_season)`

Closes a season, so there can be no more submission submitted to it.

- `_season`: ID of season

`function mintArtifact( uint[] memory submissionID,uint[] memory amount)`

Mints given amount of open edition artifacts to buyers wallet. Mints the same amount of artifacts to treasury wallet and to artist's wallet. This function also and to the artist and keeps the remaining amount in the contract.It also records data for other calculations.

- `submissionID`: ID of submission
- `amount`: amount to mint for user (doesn't include the additional mints )

`function calculateTopSubmissionsOfSeason(uint \_seasonID)`

Calculates the top submission with the most open edition NFTs sold. This function doesn't return any data, you have to call getSeason or getTopSubmissionOfSeason view functions.

- `_season`: ID of season

`function withdrawProtocolFees()`

Transfers protocol fees to protocol wallet.
