require("@nomicfoundation/hardhat-toolbox");
require("hardhat-deploy");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */

// ============================================================
// NUMEN NETWORK CONFIG
// ============================================================

const NUMEN_RPC_URL =
  process.env.NUMEN_RPC_URL ||
  "https://rpc.numen-network.org";

const CHAIN_ID =
  Number(process.env.CHAIN_ID || 32026);

const GAS_PRICE_GWEI =
  Number(
    process.env.NUMEN_GAS_PRICE_GWEI ||
    500
  );

// 1 Gwei = 1,000,000,000 Wei
const NUMEN_GAS_PRICE =
  GAS_PRICE_GWEI * 1_000_000_000;


// ============================================================
// PRIVATE KEY
// ============================================================

const accounts =
  process.env.PRIVATE_KEY
    ? [process.env.PRIVATE_KEY]
    : [];


// ============================================================
// HARDHAT CONFIG
// ============================================================

module.exports = {

  // ----------------------------------------------------------
  // SOLIDITY
  // ----------------------------------------------------------

  solidity: {
    version: "0.8.24",

    settings: {

      optimizer: {
        enabled: true,
        runs: 200,
      },

      /*
       * NumenDEXPair.swap() gibi karmaşık fonksiyonlarda
       * "Stack too deep" problemini çözer.
       */
      viaIR: true,

      /*
       * Numen Network Frontier EVM uyumluluğu için
       * muhafazakâr EVM hedefi.
       */
      evmVersion: "istanbul",
    },
  },


  // ----------------------------------------------------------
  // NETWORKS
  // ----------------------------------------------------------

  networks: {

    // ========================================================
    // LOCAL HARDHAT NETWORK
    // ========================================================

    hardhat: {
      chainId: 31337,

      gas: 12_000_000,

      blockGasLimit: 12_000_000,
    },


    // ========================================================
    // NUMEN MAINNET
    // ========================================================

    numenMainnet: {
      url: NUMEN_RPC_URL,

      chainId: CHAIN_ID,

      accounts: accounts,

      /*
       * Numen RPC tarafından bildirilen:
       *
       * 500 Gwei
       *
       * = 500,000,000,000 Wei
       */
      gasPrice: NUMEN_GAS_PRICE,

      /*
       * Transaction gas limit Hardhat tarafından
       * otomatik estimate edilir.
       */
      gas: "auto",
    },
  },


  // ----------------------------------------------------------
  // HARDHAT DEPLOY
  // ----------------------------------------------------------

  namedAccounts: {
    deployer: {
      default: 0,
    },
  },


  // ----------------------------------------------------------
  // PROJECT PATHS
  // ----------------------------------------------------------

  paths: {
    sources: "./contracts",

    tests: "./test",

    cache: "./cache",

    artifacts: "./artifacts",

    deployments: "./deployments",
  },
};