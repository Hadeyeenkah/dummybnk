// src/models/Transaction.js
const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: String,
      default: 'Other',
    },

    accountType: {
      type: String,
      enum: ['checking', 'savings'],
      default: 'checking',
    },

    status: {
      type: String,
      enum: ['pending', 'completed', 'rejected'],
      default: 'completed',
    },

    transferType: {
      type: String,
      enum: ['internal', 'external', 'bill', 'deposit', 'withdrawal'],
      default: 'external',
    },

    // For external transfers
    recipientMeta: {
      recipientName: String,
      bankName: String,
      routingNumber: String,
      accountNumber: String,
    },

    note: {
      type: String,
      default: '',
    },

    date: {
      type: Date,
      default: Date.now,
    },

    reference: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for faster queries
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ reference: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
