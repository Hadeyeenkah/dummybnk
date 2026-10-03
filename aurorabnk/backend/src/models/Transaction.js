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
      // `processing` is an internal, short-lived state used while an
      // administrator settles a paired transfer.  It prevents a second
      // approval request from applying the same transfer twice.
      enum: ['pending', 'processing', 'completed', 'rejected'],
      default: 'completed',
    },

    transferType: {
      type: String,
      enum: ['internal', 'external', 'bill', 'deposit', 'withdrawal', 'crypto_deposit', 'investment', 'admin_adjustment'],
      default: 'external',
    },

    // For external transfers
    recipientMeta: {
      recipientName: String,
      bankName: String,
      routingNumber: String,
      accountNumber: String,
      recipientEmail: String,
      recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recipientAccountNumber: String,
      recipientRoutingNumber: String,
      externalBank: { type: Boolean, default: false },
      senderName: String,
      senderEmail: String,
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      senderAccountNumber: String,
      senderRoutingNumber: String,
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

    // A transfer has two ledger entries (a debit and a credit).  `reference`
    // stays unique per ledger entry, while this value is the shared,
    // customer-facing transfer reference used to settle the pair together.
    transferReference: {
      type: String,
      index: true,
    },

    transferRole: {
      type: String,
      enum: ['debit', 'credit'],
    },

    // The browser supplies this once for a submission and reuses it on a
    // network retry.  It makes POST /transfers safe to retry without creating
    // another transfer.
    idempotencyKey: {
      type: String,
      trim: true,
      maxlength: 128,
    },
  },
  { timestamps: true }
);

// Index for faster queries
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ status: 1 });
TransactionSchema.index({ transferReference: 1, transferRole: 1 });
TransactionSchema.index(
  { userId: 1, idempotencyKey: 1, transferRole: 1 },
  {
    unique: true,
    partialFilterExpression: { idempotencyKey: { $exists: true } },
  }
);
TransactionSchema.index({ reference: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
