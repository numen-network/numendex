const mongoose = require("mongoose");

const PoolSchema = new mongoose.Schema(
  {
    // Pair contract address
    pairAddress: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    // Human-readable pool name
    // Example: NUMN/TEST, TEST/NDEX
    poolName: {
      type: String,
      default: "TOKEN0/TOKEN1",
    },

    // ==========================================
    // TOKEN 0
    // ==========================================

    token0: {
      type: String,
      required: true,
      lowercase: true,
    },

    token0Symbol: {
      type: String,
      required: true,
    },

    token0Decimals: {
      type: Number,
      required: true,
      default: 18,
    },

    // ==========================================
    // TOKEN 1
    // ==========================================

    token1: {
      type: String,
      required: true,
      lowercase: true,
    },

    token1Symbol: {
      type: String,
      required: true,
    },

    token1Decimals: {
      type: Number,
      required: true,
      default: 18,
    },

    // ==========================================
    // RAW RESERVES
    // ==========================================

    // Always store blockchain uint256/uint112 values
    // as strings. Never JS Number.
    reserve0: {
      type: String,
      required: true,
      default: "0",
    },

    reserve1: {
      type: String,
      required: true,
      default: "0",
    },

    // ==========================================
    // PRICE DATA
    // ==========================================

    // token0 price expressed in token1
    // Example:
    // token0 = NDEX
    // token1 = TEST
    // 1 NDEX = 10 TEST
    // price = 10
    price: {
      type: Number,
      default: 0,
    },

    priceChange: {
      type: Number,
      default: 0,
    },

    // ==========================================
    // BLOCKCHAIN INDEXING
    // ==========================================

    blockNumber: {
      type: Number,
      required: true,
    },

    blockTimestamp: {
      type: Date,
      default: null,
    },

    // Helps us distinguish active pools
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// ==========================================
// INDEXES
// ==========================================

// Useful for token -> pool searches
PoolSchema.index({ token0: 1 });
PoolSchema.index({ token1: 1 });

// Useful when querying pools containing both tokens
PoolSchema.index({ token0: 1, token1: 1 });

module.exports = mongoose.model(
  "Pool",
  PoolSchema
);