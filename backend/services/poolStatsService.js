const { ethers } = require("ethers");

const Pool = require("../models/Pool.model");
const Swap = require("../models/Swap.model");
const { enrichPoolStatsWithUsd } = require("./marketDataService");

// ==========================================
// HELPERS
// ==========================================

function safeNumber(value) {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function formatRawAmount(
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

function normalizePairAddress(
  pairAddress
) {
  const value =
    String(
      pairAddress || ""
    ).trim();

  if (
    !value ||
    !ethers.isAddress(value)
  ) {
    throw new Error(
      "Invalid pair address."
    );
  }

  return value.toLowerCase();
}

// ==========================================
// TIME WINDOWS
// ==========================================

function getTimeWindows() {
  const now =
    new Date();

  const oneDayAgo =
    new Date(
      now.getTime() -
        24 *
          60 *
          60 *
          1000
    );

  const thirtyDaysAgo =
    new Date(
      now.getTime() -
        30 *
          24 *
          60 *
          60 *
          1000
    );

  return {
    now,
    oneDayAgo,
    thirtyDaysAgo,
  };
}

// ==========================================
// SWAP AMOUNTS
// ==========================================

function getSwapTokenAmounts(
  swap,
  pool
) {
  const amount0In =
    safeNumber(
      formatRawAmount(
        swap.amount0In,
        pool.token0Decimals
      )
    );

  const amount1In =
    safeNumber(
      formatRawAmount(
        swap.amount1In,
        pool.token1Decimals
      )
    );

  const amount0Out =
    safeNumber(
      formatRawAmount(
        swap.amount0Out,
        pool.token0Decimals
      )
    );

  const amount1Out =
    safeNumber(
      formatRawAmount(
        swap.amount1Out,
        pool.token1Decimals
      )
    );

  return {
    amount0In,
    amount1In,
    amount0Out,
    amount1Out,
  };
}

// ==========================================
// TOKEN VOLUME
// ==========================================

function calculateTokenVolumes(
  swaps,
  pool
) {
  let token0Volume = 0;
  let token1Volume = 0;

  for (
    const swap of swaps
  ) {
    const {
      amount0In,
      amount1In,
      amount0Out,
      amount1Out,
    } =
      getSwapTokenAmounts(
        swap,
        pool
      );

    /*
     * For a normal Uniswap V2 swap:
     *
     * token0:
     * either amount0In OR amount0Out
     *
     * token1:
     * either amount1In OR amount1Out
     *
     * We use max(in, out) for each token
     * to measure the token amount that
     * changed hands during the swap.
     */

    token0Volume +=
      Math.max(
        amount0In,
        amount0Out
      );

    token1Volume +=
      Math.max(
        amount1In,
        amount1Out
      );
  }

  return {
    token0Volume,
    token1Volume,
  };
}

// ==========================================
// RESERVES
// ==========================================

function getFormattedReserves(
  pool
) {
  return {
    reserve0:
      formatRawAmount(
        pool.reserve0,
        pool.token0Decimals
      ),

    reserve1:
      formatRawAmount(
        pool.reserve1,
        pool.token1Decimals
      ),
  };
}

// ==========================================
// BUILD STATS
// ==========================================

async function buildPoolStats(
  pool
) {
  const {
    oneDayAgo,
    thirtyDaysAgo,
  } =
    getTimeWindows();

  /*
   * We only need the last 30 days.
   * 1D data is derived from the same result.
   */

  const swaps30d =
    await Swap.find({
      pairAddress:
        pool.pairAddress,

      blockTimestamp: {
        $gte:
          thirtyDaysAgo,
      },
    })
      .sort({
        blockTimestamp: 1,
      })
      .lean();

  const swaps1d =
    swaps30d.filter(
      (swap) =>
        new Date(
          swap.blockTimestamp
        ).getTime() >=
        oneDayAgo.getTime()
    );

  const volume1d =
    calculateTokenVolumes(
      swaps1d,
      pool
    );

  const volume30d =
    calculateTokenVolumes(
      swaps30d,
      pool
    );

  const {
    reserve0,
    reserve1,
  } =
    getFormattedReserves(
      pool
    );

  const baseStats = {
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

      reserveRaw:
        pool.reserve0,

      reserveFormatted:
        reserve0,
    },

    token1: {
      address:
        pool.token1,

      symbol:
        pool.token1Symbol,

      decimals:
        pool.token1Decimals,

      reserveRaw:
        pool.reserve1,

      reserveFormatted:
        reserve1,
    },

    price:
      safeNumber(
        pool.price
      ),

    priceChange:
      safeNumber(
        pool.priceChange
      ),

    swapCount1d:
      swaps1d.length,

    swapCount30d:
      swaps30d.length,

    volume1d: {
      token0:
        volume1d.token0Volume,

      token1:
        volume1d.token1Volume,
    },

    volume30d: {
      token0:
        volume30d.token0Volume,

      token1:
        volume30d.token1Volume,
    },

    /*
     * USD values intentionally remain null.
     *
     * We do not have a trusted USD price
     * source for every token yet.
     *
     * Do not invent TVL, volume USD or APR.
     */

    tvlUsd:
      null,

    volume1dUsd:
      null,

    volume30dUsd:
      null,

    volumeTvlRatio:
      null,

    apr:
      null,

    blockNumber:
      pool.blockNumber,

    updatedAt:
      pool.updatedAt,
  };

  return enrichPoolStatsWithUsd(baseStats);
}

// ==========================================
// ONE POOL
// ==========================================

async function getPoolSwapStats(
  pairAddress
) {
  const normalizedPair =
    normalizePairAddress(
      pairAddress
    );

  const pool =
    await Pool.findOne({
      pairAddress:
        normalizedPair,

      isActive:
        true,
    }).lean();

  if (!pool) {
    throw new Error(
      "Pool not found."
    );
  }

  return buildPoolStats(
    pool
  );
}

// ==========================================
// ALL POOLS
// ==========================================

async function getAllPoolSwapStats() {
  const pools =
    await Pool.find({
      isActive: true,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

  const results = [];

  for (
    const pool of pools
  ) {
    try {
      const stats =
        await buildPoolStats(
          pool
        );

      results.push(
        stats
      );
    } catch (error) {
      console.warn(
        `⚠️ Could not calculate stats for ${pool.pairAddress}:`,
        error.message
      );
    }
  }

  return results;
}

// ==========================================
// EXPORTS
// ==========================================

module.exports = {
  getPoolSwapStats,
  getAllPoolSwapStats,
};