const mongoose = require("mongoose");

const SwapSchema = new mongoose.Schema(
  {
    pairAddress: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    transactionHash: {
      type: String,
      required: true,
      lowercase: true,
      index: true,
    },

    logIndex: {
      type: Number,
      required: true,
    },

    blockNumber: {
      type: Number,
      required: true,
      index: true,
    },

    blockTimestamp: {
      type: Date,
      required: true,
      index: true,
    },

    sender: {
      type: String,
      required: true,
      lowercase: true,
    },

    to: {
      type: String,
      required: true,
      lowercase: true,
    },

    amount0In: {
      type: String,
      required: true,
      default: "0",
    },

    amount1In: {
      type: String,
      required: true,
      default: "0",
    },

    amount0Out: {
      type: String,
      required: true,
      default: "0",
    },

    amount1Out: {
      type: String,
      required: true,
      default: "0",
    },
  },
  {
    timestamps: true,
  }
);

SwapSchema.index(
  {
    transactionHash: 1,
    logIndex: 1,
  },
  {
    unique: true,
  }
);

SwapSchema.index({
  pairAddress: 1,
  blockTimestamp: -1,
});

SwapSchema.index({
  pairAddress: 1,
  blockNumber: -1,
});

module.exports = mongoose.model(
  "Swap",
  SwapSchema
);