require("dotenv").config();

const gasPriceGwei =
  process.env.NUMEN_GAS_PRICE_GWEI || "500";

module.exports = {
  numenMainnet: {
    rpcUrl: process.env.NUMEN_RPC_URL,
    wsUrl: process.env.NUMEN_WS_URL,
    chainId: Number(process.env.CHAIN_ID) || 32026,
    explorerUrl: process.env.EXPLORER_URL,

    gasPriceGwei,
    gasPriceWei: (
      BigInt(gasPriceGwei) * 1_000_000_000n
    ).toString(),
  },
};