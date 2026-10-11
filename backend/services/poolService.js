const { ethers } = require("ethers");
const { provider } = require("./rpc.js");
const Token = require("../models/Token.model");

// ==========================================
// ABIs
// ==========================================

const PAIR_ABI = [
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function getReserves() view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)"
];

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

// ==========================================
// TOKEN METADATA
// ==========================================

async function getTokenMetadata(tokenAddress) {
  const normalizedAddress = tokenAddress.toLowerCase();

  // First try MongoDB
  const tokenFromDb = await Token.findOne({
    address: normalizedAddress
  });

  if (tokenFromDb) {
    return {
      address: tokenAddress,
      symbol: tokenFromDb.symbol,
      decimals: Number(tokenFromDb.decimals)
    };
  }

  // If token is not in DB, read directly from blockchain
  try {
    const tokenContract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    const [symbol, decimals] = await Promise.all([
      tokenContract.symbol(),
      tokenContract.decimals()
    ]);

    return {
      address: tokenAddress,
      symbol: symbol,
      decimals: Number(decimals)
    };
  } catch (error) {
    console.warn(
      `Could not read token metadata for ${tokenAddress}:`,
      error.message
    );

    return {
      address: tokenAddress,
      symbol: `${tokenAddress.slice(0, 6)}...`,
      decimals: 18
    };
  }
}

// ==========================================
// FETCH POOL DETAILS
// ==========================================

async function fetchPoolDetails(poolAddress) {
  try {
    if (!ethers.isAddress(poolAddress)) {
      throw new Error(
        `Invalid pool address: ${poolAddress}`
      );
    }

    const normalizedPoolAddress =
      ethers.getAddress(poolAddress);

    const pairContract = new ethers.Contract(
      normalizedPoolAddress,
      PAIR_ABI,
      provider
    );

    // ==========================================
    // READ PAIR
    // ==========================================

    const [
      token0Address,
      token1Address,
      reserves
    ] = await Promise.all([
      pairContract.token0(),
      pairContract.token1(),
      pairContract.getReserves()
    ]);

    // ==========================================
    // TOKEN METADATA
    // ==========================================

    const [
      token0Metadata,
      token1Metadata
    ] = await Promise.all([
      getTokenMetadata(token0Address),
      getTokenMetadata(token1Address)
    ]);

    const token0Symbol =
      token0Metadata.symbol;

    const token1Symbol =
      token1Metadata.symbol;

    const token0Decimals =
      token0Metadata.decimals;

    const token1Decimals =
      token1Metadata.decimals;

    // ==========================================
    // RAW RESERVES
    // ==========================================

    const reserve0Raw =
      reserves[0];

    const reserve1Raw =
      reserves[1];

    const reserve0 =
      reserve0Raw.toString();

    const reserve1 =
      reserve1Raw.toString();

    // ==========================================
    // FORMATTED RESERVES
    // ==========================================

    const reserve0Formatted =
      ethers.formatUnits(
        reserve0Raw,
        token0Decimals
      );

    const reserve1Formatted =
      ethers.formatUnits(
        reserve1Raw,
        token1Decimals
      );

    // ==========================================
    // PRICE
    // ==========================================
    //
    // price means:
    //
    // 1 token0 = X token1
    //
    // Therefore:
    //
    // price = reserve1 / reserve0
    //
    // Example:
    //
    // token0 = NDEX
    // reserve0 = 500 NDEX
    //
    // token1 = TEST
    // reserve1 = 5000 TEST
    //
    // price = 5000 / 500 = 10
    //
    // 1 NDEX = 10 TEST
    // ==========================================

    const r0 =
      parseFloat(reserve0Formatted);

    const r1 =
      parseFloat(reserve1Formatted);

    let price = 0;

    if (
      Number.isFinite(r0) &&
      Number.isFinite(r1) &&
      r0 > 0
    ) {
      price = r1 / r0;
    }

    // ==========================================
    // BLOCK INFO
    // ==========================================

    const blockNumber =
      await provider.getBlockNumber();

    // ==========================================
    // RESULT
    // ==========================================

    return {
      success: true,

      address:
        normalizedPoolAddress,

      poolName:
        `${token0Symbol}/${token1Symbol}`,

      token0:
        token0Address,

      token1:
        token1Address,

      token0Symbol:
        token0Symbol,

      token1Symbol:
        token1Symbol,

      token0Decimals:
        token0Decimals,

      token1Decimals:
        token1Decimals,

      reserve0:
        reserve0,

      reserve1:
        reserve1,

      reserve0Formatted:
        reserve0Formatted,

      reserve1Formatted:
        reserve1Formatted,

      price:
        price,

      blockNumber:
        blockNumber
    };
  } catch (error) {
    console.error(
      `Failed to fetch pool details for ${poolAddress}:`,
      error.message
    );

    return {
      success: false,
      address: poolAddress,
      error: error.message
    };
  }
}

module.exports = {
  fetchPoolDetails
};