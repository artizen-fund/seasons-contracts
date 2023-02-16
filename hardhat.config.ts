import { task } from "hardhat/config";
import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "solidity-coverage";
import "@primitivefi/hardhat-dodoc";
import { HardhatUserConfig, NetworkUserConfig } from "hardhat/types";
import * as dotenv from "dotenv";

dotenv.config();
const isTestEnv = process.env.NODE_ENV === "test";

const netWorkConfig: NetworkUserConfig | undefined = isTestEnv
  ? ({
      mainnet: {
        url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.MAINNET_DEPLOYER_PRIV_KEY}`],
      },

      goerli: {
        url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API}`,
        accounts: [`${process.env.GOERLI_DEPLOYER_PRIV_KEY}`],
      },
    } as NetworkUserConfig)
  : undefined;

const apiKeys = isTestEnv
  ? {
      mainnet: process.env.ETHERSCAN_API_KEY,
      rinkeby: process.env.ETHERSCAN_API_KEY,
      ropsten: process.env.ETHERSCAN_API_KEY,
      goerli: process.env.ETHERSCAN_API_KEY,
      kovan: process.env.ETHERSCAN_API_KEY,
      opera: process.env.FTMSCAN_API_KEY,
      ftmTestnet: process.env.FTMSCAN_API_KEY,
      polygon: process.env.POLYGONSCAN_API_KEY,
      polygonMumbai: process.env.POLYGONSCAN_API_KEY,
      optimisticEthereum: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
      optimisticKovan: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
      arbitrumOne: process.env.ARBISCAN_API_KEY,
      arbitrumTestnet: process.env.ARBISCAN_API_KEY,
      avalanche: process.env.SNOWTRACE_API_KEY,
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY,
      xdai: process.env.BLOCKSCOUT_API_KEY,
    }
  : undefined;

const loadConfig = (): HardhatUserConfig => {
  const config = {
    defaultNetwork: "hardhat",
    solidity: {
      compilers: [
        {
          version: "0.8.18",
          settings: {
            optimizer: {
              enabled: true,
              runs: 1000,
            },
          },
        },
      ],
    },
    networks: {
      hardhat: {
        accounts: {
          accountsBalance: "1000000000000000000000000",
        },
      },
      localhost: {
        url: "http://localhost:8545",
        /*
          notice no env vars here? it will just use account 0 of the hardhat node to deploy
          (you can put in a mnemonic here to set the deployer locally)
        */
      },
    },
    etherscan: {
      apiKey: apiKeys,
    },
    dodoc: {
      exclude: [
        "Address",
        "console",
        "Context",
        "Counters",
        "ECDSA",
        "EIP712",
        "ERC20",
        "ERC20Permit",
        "ERC165",
        "ERC165Storage",
        "ERC721",
        "ERC1155",
        "IERC20",
        "IERC20Metadata",
        "IERC20Permit",
        "IERC20Receiver",
        "IERC721",
        "IERC721Metadata",
        "IERC721Receiver",
        "IERC165",
        "IERC1155",
        "IERC1155MetadataURI",
        "IERC1155Receiver",
        "IERC1271",
        "INFT",
        "Ownable",
        "ReentrancyGuard",
        "SafeERC20",
        "SignatureChecker",
        "Strings",
        "TestUser",
      ],
    },
    // mocha options can be set here
    mocha: {
      // timeout: "300s",
    },
    // typechain: {
    //   outDir: 'src/types',
    //   target: 'ethers-v5',
    //   alwaysGenerateOverloads: false, // should overloads with full signatures like deposit(uint256) be generated always, even if there are no overloads?
    //   externalArtifacts: ['externalArtifacts/*.json'], // optional array of glob patterns with external artifacts to process (for example external libs from node_modules)
    // },
  };
  if (isTestEnv) {
    return config;
  } else {
    return {
      ...config,
      ...apiKeys,
      ...netWorkConfig,
    };
  }
};

const config = loadConfig();

export default config;
