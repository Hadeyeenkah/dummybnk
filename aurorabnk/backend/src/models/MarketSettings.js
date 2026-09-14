const mongoose = require('mongoose');

const MarketSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, unique: true, default: 'primary' },
    todaysReturn: { type: Number, default: 184.32 },
    todaysReturnPercent: { type: Number, default: 10.5 },
    marketStatus: { type: String, enum: ['open', 'closed'], default: 'open' },
    marketMessage: { type: String, default: 'Prices update during US market hours.' },
    watchlistChanges: [{
      symbol: { type: String, uppercase: true, trim: true },
      changePercent: { type: Number, min: -100, max: 100 },
    }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MarketSettings || mongoose.model('MarketSettings', MarketSettingsSchema);
