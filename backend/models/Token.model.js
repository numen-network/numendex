const mongoose = require("mongoose");

const TokenSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true, lowercase: true, index: true },
  name: { type: String, default: "Discovered Token", maxlength: 128 },
  symbol: { type: String, default: "TOKEN", maxlength: 32 },
  decimals: { type: Number, default: 18, min: 0, max: 255 },
  totalSupply: { type: String, default: "0" },
  holders: { type: Number, default: 0, min: 0 },
  source: { type: String, enum: ["indexer", "pool", "imported", "official"], default: "indexer" },
  verified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

TokenSchema.pre("save", function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model("Token", TokenSchema);
