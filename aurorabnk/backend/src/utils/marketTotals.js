const MarketOrder = require('../models/MarketOrder');

// "Today" is deliberately defined as the current UTC calendar day. Keeping
// that boundary in one place means the customer market page and the admin
// console cannot disagree about which paper orders contribute to the figure.
const startOfTodayUtc = (now = new Date()) => new Date(Date.UTC(
  now.getUTCFullYear(),
  now.getUTCMonth(),
  now.getUTCDate(),
));

const getUserTradeTotal = async (userId) => {
  const result = await MarketOrder.aggregate([
    {
      $match: {
        status: 'submitted',
        userId,
        createdAt: { $gte: startOfTodayUtc() },
      },
    },
    {
      $group: {
        _id: null,
        estimatedTotal: { $sum: { $multiply: ['$quantity', '$referencePrice'] } },
        tradeCount: { $sum: 1 },
      },
    },
  ]);

  return {
    estimatedTradeTotal: Number((result[0]?.estimatedTotal || 0).toFixed(2)),
    tradeCount: result[0]?.tradeCount || 0,
  };
};

module.exports = { getUserTradeTotal, startOfTodayUtc };
