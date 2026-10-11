const { ethers } = require("ethers");
require("./env");

// ==========================================
// NUMEN NETWORK CONFIG
// ==========================================

const RPC_URL =
  process.env.NUMEN_RPC_URL ||
  "https://rpc.numen-network.org";

const CHAIN_ID =
  Number(process.env.CHAIN_ID || 32026);

// ==========================================
// CUSTOM NUMEN NETWORK
// ==========================================

const network = {
  name: "numen",
  chainId: CHAIN_ID,
};

// ==========================================
// JSON-RPC PROVIDER
// Ethers v6
// ==========================================

const provider =
  new ethers.JsonRpcProvider(
    RPC_URL,
    network,
    {
      staticNetwork: true,
    }
  );

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  provider,
  network,
};