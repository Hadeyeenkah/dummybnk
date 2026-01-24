// src/models/Bill.js
const mongoose = require('mongoose');

const BillSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    payee: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    category: {
      type: String,
      enum: ['Utilities', 'Internet', 'Phone', 'Rent', 'Insurance', 'Credit Card', 'Other'],
      default: 'Other',
    },
    accountNumber: {
      type: String,
      trim: true,
    },
    fromAccount: {
      type: String,
      enum: ['checking', 'savings'],
      default: 'checking',
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    transactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Transaction',
      default: null,
    },
    note: {
      type: String,
      default: '',
    },
    paymentDate: {
      type: Date,
      default: () => new Date(),
    },
    dueDate: {
      type: Date,
      default: null,
    },
    reference: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Bill', BillSchema);
