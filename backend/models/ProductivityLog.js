const mongoose = require('mongoose');

const productivityLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  date: {
    type: Date,
    required: true,
    index: true
  },
  counters: {
    // Map of category names to counts
    type: Map,
    of: Number,
    default: {}
  },
  totalFocusMinutes: {
    type: Number,
    default: 0
  },
  completedStreak: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexing for date and category lookups
// Note: MongoDB handles Map keys indexing if specified,
// but usually we index the date and userId for most queries.
// We add a compound index for efficient user-specific date queries.
productivityLogSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('ProductivityLog', productivityLogSchema);
