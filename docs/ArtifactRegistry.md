# ArtifactRegistry









## Methods

### amountPurchasedPerTokenPerAddress

```solidity
function amountPurchasedPerTokenPerAddress(address, uint256) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### artifactTopBuyer

```solidity
function artifactTopBuyer(uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### artizenSplitPercentage

```solidity
function artizenSplitPercentage() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### balanceOf

```solidity
function balanceOf(address account, uint256 id) external view returns (uint256)
```



*See {IERC1155-balanceOf}. Requirements: - `account` cannot be the zero address.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined
| id | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### balanceOfBatch

```solidity
function balanceOfBatch(address[] accounts, uint256[] ids) external view returns (uint256[])
```



*See {IERC1155-balanceOfBatch}. Requirements: - `accounts` and `ids` must have the same length.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| accounts | address[] | undefined
| ids | uint256[] | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256[] | undefined

### closeSeason

```solidity
function closeSeason(uint256 _season, uint256 _lastTokenIDOfSeason) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _season | uint256 | undefined
| _lastTokenIDOfSeason | uint256 | undefined

### createProject

```solidity
function createProject(uint256 _season, string _tokenURI, address payable _projectOwner) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _season | uint256 | undefined
| _tokenURI | string | undefined
| _projectOwner | address payable | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getArtizenWalletAddress

```solidity
function getArtizenWalletAddress() external view returns (address wallet)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| wallet | address | undefined

### getLatestTokenID

```solidity
function getLatestTokenID() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### getTopBuyerOfSeason

```solidity
function getTopBuyerOfSeason(uint256 season) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| season | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### initialize

```solidity
function initialize() external nonpayable
```






### isApprovedForAll

```solidity
function isApprovedForAll(address account, address operator) external view returns (bool)
```



*See {IERC1155-isApprovedForAll}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account | address | undefined
| operator | address | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### lastTokenIDOfSeason

```solidity
function lastTokenIDOfSeason(uint256) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### latestTokenID

```solidity
function latestTokenID() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### mintArtifact

```solidity
function mintArtifact(uint256 submissionID, uint256[] amount) external payable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| submissionID | uint256 | undefined
| amount | uint256[] | undefined

### owner

```solidity
function owner() external view returns (address)
```



*Returns the address of the current owner.*


#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### projectCount

```solidity
function projectCount() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### renounceOwnership

```solidity
function renounceOwnership() external nonpayable
```



*Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.*


### safeBatchTransferFrom

```solidity
function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] amounts, bytes data) external nonpayable
```



*See {IERC1155-safeBatchTransferFrom}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined
| to | address | undefined
| ids | uint256[] | undefined
| amounts | uint256[] | undefined
| data | bytes | undefined

### safeTransferFrom

```solidity
function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes data) external nonpayable
```



*See {IERC1155-safeTransferFrom}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| from | address | undefined
| to | address | undefined
| id | uint256 | undefined
| amount | uint256 | undefined
| data | bytes | undefined

### seasonClosed

```solidity
function seasonClosed(uint256) external view returns (bool)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### seasonTopBuyer

```solidity
function seasonTopBuyer(uint256) external view returns (address)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined

### setApprovalForAll

```solidity
function setApprovalForAll(address operator, bool approved) external nonpayable
```



*See {IERC1155-setApprovalForAll}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| operator | address | undefined
| approved | bool | undefined

### setArtizenFeeSplitPercentage

```solidity
function setArtizenFeeSplitPercentage(uint256 percentage) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| percentage | uint256 | undefined

### setDAOWalletAddress

```solidity
function setDAOWalletAddress(address payable _artizenWallet) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _artizenWallet | address payable | undefined

### setTokenPrice

```solidity
function setTokenPrice(uint256 price) external nonpayable returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| price | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### shutdown

```solidity
function shutdown(bool _isShutdown) external nonpayable
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _isShutdown | bool | undefined

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```



*See {IERC165-supportsInterface}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| interfaceId | bytes4 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | bool | undefined

### tokenPrice

```solidity
function tokenPrice() external view returns (uint256)
```






#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### topAmontOfTokenSold

```solidity
function topAmontOfTokenSold(uint256) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### totalPurchasedPerAddressPerSeason

```solidity
function totalPurchasedPerAddressPerSeason(address, uint256) external view returns (uint256)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | address | undefined
| _1 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

### transferOwnership

```solidity
function transferOwnership(address newOwner) external nonpayable
```



*Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| newOwner | address | undefined

### uri

```solidity
function uri(uint256) external view returns (string)
```



*See {IERC1155MetadataURI-uri}. This implementation returns the same URI for *all* token types. It relies on the token type ID substitution mechanism https://eips.ethereum.org/EIPS/eip-1155#metadata[defined in the EIP]. Clients calling this function must replace the `\{id\}` substring with the actual token type ID.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| _0 | uint256 | undefined

#### Returns

| Name | Type | Description |
|---|---|---|
| _0 | string | undefined



## Events

### ApprovalForAll

```solidity
event ApprovalForAll(address indexed account, address indexed operator, bool approved)
```



*Emitted when `account` grants or revokes permission to `operator` to transfer their tokens, according to `approved`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| account `indexed` | address | undefined |
| operator `indexed` | address | undefined |
| approved  | bool | undefined |

### ArtifactMinted

```solidity
event ArtifactMinted(address to, uint256 tokenID, uint256 amount)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| to  | address | undefined |
| tokenID  | uint256 | undefined |
| amount  | uint256 | undefined |

### ArtizenFeeSplitPercentageSet

```solidity
event ArtizenFeeSplitPercentageSet(uint256 percentage)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| percentage  | uint256 | undefined |

### ArtizenWalletAddressSet

```solidity
event ArtizenWalletAddressSet(address artizenWallet)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| artizenWallet  | address | undefined |

### Initialized

```solidity
event Initialized(uint8 version)
```



*Triggered when the contract has been initialized or reinitialized.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| version  | uint8 | undefined |

### OwnershipTransferred

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| previousOwner `indexed` | address | undefined |
| newOwner `indexed` | address | undefined |

### ProjectCreated

```solidity
event ProjectCreated(uint256 submissionID, address projectOwner)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| submissionID  | uint256 | undefined |
| projectOwner  | address | undefined |

### ProjectRenewed

```solidity
event ProjectRenewed(uint256 submissionID)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| submissionID  | uint256 | undefined |

### ProjectUpdated

```solidity
event ProjectUpdated(uint256 submissionID)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| submissionID  | uint256 | undefined |

### SeasonClosed

```solidity
event SeasonClosed(uint256 _season)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _season  | uint256 | undefined |

### Shutdown

```solidity
event Shutdown(bool _isShutdown)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| _isShutdown  | bool | undefined |

### TokenPriceSet

```solidity
event TokenPriceSet(uint256 price)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| price  | uint256 | undefined |

### TransferBatch

```solidity
event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values)
```



*Equivalent to multiple {TransferSingle} events, where `operator`, `from` and `to` are the same for all transfers.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| operator `indexed` | address | undefined |
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| ids  | uint256[] | undefined |
| values  | uint256[] | undefined |

### TransferSingle

```solidity
event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value)
```



*Emitted when `value` tokens of token type `id` are transferred from `from` to `to` by `operator`.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| operator `indexed` | address | undefined |
| from `indexed` | address | undefined |
| to `indexed` | address | undefined |
| id  | uint256 | undefined |
| value  | uint256 | undefined |

### URI

```solidity
event URI(string value, uint256 indexed id)
```



*Emitted when the URI for token type `id` changes to `value`, if it is a non-programmatic URI. If an {URI} event was emitted for `id`, the standard https://eips.ethereum.org/EIPS/eip-1155#metadata-extensions[guarantees] that `value` will equal the value returned by {IERC1155MetadataURI-uri}.*

#### Parameters

| Name | Type | Description |
|---|---|---|
| value  | string | undefined |
| id `indexed` | uint256 | undefined |



## Errors

### IncorrectAmount

```solidity
error IncorrectAmount(string message)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| message | string | undefined |

### SeasonAlreadyClosed

```solidity
error SeasonAlreadyClosed(uint256 season)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| season | uint256 | undefined |

### ZeroAddressNotAllowed

```solidity
error ZeroAddressNotAllowed(string message)
```





#### Parameters

| Name | Type | Description |
|---|---|---|
| message | string | undefined |


