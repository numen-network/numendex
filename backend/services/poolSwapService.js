const { ethers } = require("ethers");

const Pool = require("../models/Pool.model");
const Swap = require("../models/Swap.model");

// ==========================================
// HELPERS
// ==========================================

function normalizeAddress(address) {
  const value =
    String(address || "")
      .replace(/['"]+/g, "")
      .trim();

  if (!ethers.isAddress(value)) {
    throw new Error(
      "Invalid pool address."
    );
  }

  return value.toLowerCase();
}

function formatAmount(
  rawAmount,
  decimals
) {
  try {
    return ethers.formatUnits(
      rawAmount || "0",
      Number(decimals ?? 18)
    );
  } catch {
    return "0";
  }
}

function getPositiveAmount(
  value
) {
  try {
    return BigInt(
      value || "0"
    );
  } catch {
    return 0n;
  }
}

// ==========================================
// DETERMINE SWAP DIRECTION
// ==========================================

function getSwapType(
  swap,
  pool
) {
  const amount0In =
    getPositiveAmount(
      swap.amount0In
    );

  const amount1In =
    getPositiveAmount(
      swap.amount1In
    );

  const amount0Out =
    getPositiveAmount(
      swap.amount0Out
    );

  const amount1Out =
    getPositiveAmount(
      swap.amount1Out
    );

  /*
   * token0 -> token1
   *
   * User supplied token0 and received
   * token1.
   */
  if (
    amount0In > 0n &&
    amount1Out > 0n
  ) {
    return {
      side: "SELL",
      tokenIn:
        pool.token0Symbol,
      tokenOut:
        pool.token1Symbol,
      label:
        `Sell ${pool.token0Symbol}`,
    };
  }

  /*
   * token1 -> token0
   *
   * User supplied token1 and received
   * token0.
   */
  if (
    amount1In > 0n &&
    amount0Out > 0n
  ) {
    return {
      side: "BUY",
      tokenIn:
        pool.token1Symbol,
      tokenOut:
        pool.token0Symbol,
      label:
        `Buy ${pool.token0Symbol}`,
    };
  }

  return {
    side: "SWAP",
    tokenIn: null,
    tokenOut: null,
    label: "Swap",
  };
}

// ==========================================
// FORMAT SWAP
// ==========================================

function formatSwap(
  swap,
  pool
) {
  const direction =
    getSwapType(
      swap,
      pool
    );

  const amount0In =
    formatAmount(
      swap.amount0In,
      pool.token0Decimals
    );

  const amount1In =
    formatAmount(
      swap.amount1In,
      pool.token1Decimals
    );

  const amount0Out =
    formatAmount(
      swap.amount0Out,
      pool.token0Decimals
    );

  const amount1Out =
    formatAmount(
      swap.amount1Out,
      pool.token1Decimals
    );

  const token0Amount =
    getPositiveAmount(
      swap.amount0In
    ) > 0n
      ? amount0In
      : amount0Out;

  const token1Amount =
    getPositiveAmount(
      swap.amount1In
    ) > 0n
      ? amount1In
      : amount1Out;

  return {
    pairAddress:
      swap.pairAddress,

    transactionHash:
      swap.transactionHash,

    logIndex:
      swap.logIndex,

    blockNumber:
      swap.blockNumber,

    timestamp:
      swap.blockTimestamp,

    sender:
      swap.sender,

    to:
      swap.to,

    type:
      direction.label,

    side:
      direction.side,

    tokenIn:
      direction.tokenIn,

    tokenOut:
      direction.tokenOut,

    token0: {
      address:
        pool.token0,

      symbol:
        pool.token0Symbol,

      decimals:
        pool.token0Decimals,

      amount:
        token0Amount,

      amountIn:
        amount0In,

      amountOut:
        amount0Out,
    },

    token1: {
      address:
        pool.token1,

      symbol:
        pool.token1Symbol,

      decimals:
        pool.token1Decimals,

      amount:
        token1Amount,

      amountIn:
        amount1In,

      amountOut:
        amount1Out,
    },
  };
}

// ==========================================
// GET POOL SWAPS
// ==========================================

async function getPoolSwaps({
  pairAddress,
  limit = 50,
  skip = 0,
}) {
  const address =
    normalizeAddress(
      pairAddress
    );

  const normalizedLimit =
    Math.min(
      Math.max(
        Number(limit) || 50,
        1
      ),
      200
    );

  const normalizedSkip =
    Math.max(
      Number(skip) || 0,
      0
    );

  const pool =
    await Pool.findOne({
      pairAddress: address,
      isActive: true,
    }).lean();

  if (!pool) {
    throw new Error(
      "Pool not found."
    );
  }

  const [
    swaps,
    total,
  ] =
    await Promise.all([
      Swap.find({
        pairAddress: address,
      })
        .sort({
          blockNumber: -1,
          logIndex: -1,
        })
        .skip(
          normalizedSkip
        )
        .limit(
          normalizedLimit
        )
        .lean(),

      Swap.countDocuments({
        pairAddress: address,
      }),
    ]);

  const data =
    swaps.map(
      (swap) =>
        formatSwap(
          swap,
          pool
        )
    );

  return {
    pairAddress:
      pool.pairAddress,

    poolName:
      pool.poolName,

    token0: {
      address:
        pool.token0,

      symbol:
        pool.token0Symbol,

      decimals:
        pool.token0Decimals,
    },

    token1: {
      address:
        pool.token1,

      symbol:
        pool.token1Symbol,

      decimals:
        pool.token1Decimals,
    },

    total,
    limit:
      normalizedLimit,
    skip:
      normalizedSkip,

    hasMore:
      normalizedSkip +
        data.length <
      total,

    swaps:
      data,
  };
}

module.exports = {
  getPoolSwaps,
};