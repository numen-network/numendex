const mongoose = require('mongoose');

const IndexerStateSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  blockNumber: { type: Number, required: true }
});

module.exports = mongoose.model('IndexerState', IndexerStateSchema);