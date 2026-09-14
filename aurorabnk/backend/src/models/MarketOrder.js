const mongoose = require('mongoose');

const MarketOrderSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, trim: true },
    side: { type: String, enum: ['buy'], default: 'buy' },
    quantity: { type: Number, required: true, min: 0.0001 },
    orderType: { type: String, enum: ['market'], default: 'market' },
    referencePrice: { type: Number, required: true, min: 0 },
    status: { type: String, enum: ['submitted', 'cancelled'], default: 'submitted' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.MarketOrder || mongoose.model('MarketOrder', MarketOrderSchema);
