# Artifact Registry Contract

This upgradable contract registers the Artizen Seasons and each submission (project) to a season. It also mints open edition Artifacts to each submission and has inherited functionalities from the Open Zeppelin ERC1155Upgradeable,OwnableUpgradeable and ERC1155URIStorageUpgradeable contracts.

### function setTreasuryAddress

- Use this function to set central treasury wallet address after deployment. This wallet will securely keep funds until the end of the season.

### function setProtocolWalletAddress

- Use this function to set central protocol wallet address after deployment. This wallet will store protocol fees.

### function setTokenPrice

- Sets the price of a single NFT.

### function setTreasurySplitPercentage

- Sets the treasury percentage of a single token's price.

### function shutdown

- This is an emergency function that shuts all main functionalities of the contract.

### function createSeason

- Creates a season with given details.

### function createSubmission

- Creates a submission with given details.

### function closeSeason

- Closes a season, so there can be no more submission submitted to it.

### function mintArtifact

- Mints given amount of open edition artifacts to buyers wallet. Mints the same amount of artifacts to treasury wallet and to artist's wallet. This function also transfers the funds to the treasury wallet and to the artist.It also records data for other calculations.

### function calculateTopSubmissionsOfSeason

- Calculates the top submission with the most open edition NFTs sold. This function doesn't return any data, you have to call getSeason or getTopSubmissionOfSeason view functions.

### function withdrawProtocolFees

- Transfers protocol fees to protocol wallet.
