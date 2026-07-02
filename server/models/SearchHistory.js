const mongoose = require('mongoose');

const searchHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  city: {
    type: String,
    required: true,
    trim: true,
  },
  country: {
    type: String,
    trim: true,
  },
  temperature: Number,
  condition: String,
  icon: String,
  searchedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index for fast per-user lookups sorted by date
searchHistorySchema.index({ userId: 1, searchedAt: -1 });

module.exports = mongoose.model('SearchHistory', searchHistorySchema);
