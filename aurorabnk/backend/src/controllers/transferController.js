// src/controllers/transferController.js
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Internal transfer (between own accounts) - instant, no approval needed
exports.internalTransfer = async (req, res) => {
  try {
    const { amount, fromAccount, toAccount, note } = req.body;
    const userId = req.userId;

    console.log('🔄 Internal transfer request:', { userId, amount, fromAccount, toAccount });

    // Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid transfer amount',
      });
    }

    if (!fromAccount || !toAccount) {
      return res.status(400).json({
        status: 'error',
        message: 'Source and destination accounts are required',
      });
    }

    if (fromAccount === toAccount) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot transfer to the same account',
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid amount',
      });
    }

    // Get user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Initialize accounts if needed
    if (!user.accounts || user.accounts.length === 0) {
      user.accounts = [
        { accountType: 'checking', balance: user.balance || 0 },
        { accountType: 'savings', balance: 0 }
      ];
    }

    // Check balance
    const fromAccountObj = user.accounts.find(a => a.accountType === fromAccount);
    const fromBalance = fromAccountObj?.balance || 0;

    if (fromBalance < numericAmount) {
      return res.status(400).json({
        status: 'error',
        message: `Insufficient funds in ${fromAccount}. Available: $${fromBalance.toFixed(2)}`,
      });
    }

    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `INT-${userId.toString().substring(0, 8)}-${Date.now()}-${randomId}`;

    // Create debit transaction
    const debitTransaction = await Transaction.create({
      userId,
      amount: -numericAmount,
      description: `Transfer to ${toAccount}`,
      category: 'Internal Transfer',
      accountType: fromAccount,
      status: 'completed',
      transferType: 'internal',
      reference,
      note: note || '',
      date: new Date(),
    });

    // Create credit transaction
    const creditTransaction = await Transaction.create({
      userId,
      amount: numericAmount,
      description: `Transfer from ${fromAccount}`,
      category: 'Internal Transfer',
      accountType: toAccount,
      status: 'completed',
      transferType: 'internal',
      reference,
      note: note || '',
      date: new Date(),
    });

    // Update balances
    const fromIndex = user.accounts.findIndex(a => a.accountType === fromAccount);
    const toIndex = user.accounts.findIndex(a => a.accountType === toAccount);

    if (fromIndex !== -1) {
      user.accounts[fromIndex].balance -= numericAmount;
    }

    if (toIndex !== -1) {
      user.accounts[toIndex].balance += numericAmount;
    } else {
      user.accounts.push({ accountType: toAccount, balance: numericAmount });
    }

    // Recalculate total balance
    user.balance = user.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    user.markModified('accounts');
    await user.save();

    console.log('✅ Internal transfer completed');

    res.json({
      status: 'success',
      message: 'Transfer completed successfully',
      transfer: {
        reference,
        amount: numericAmount,
        fromAccount,
        toAccount,
        status: 'completed',
        date: new Date(),
      },
      debitTransaction: {
        id: debitTransaction._id,
        amount: debitTransaction.amount,
      },
      creditTransaction: {
        id: creditTransaction._id,
        amount: creditTransaction.amount,
      },
    });
  } catch (error) {
    console.error('❌ Internal transfer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error processing transfer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// External transfer (to another user) - requires admin approval
exports.externalTransfer = async (req, res) => {
  try {
    const { amount, fromAccount, recipientEmail, recipientAccountNumber, recipientRoutingNumber, recipientName, note } = req.body;
    const userId = req.userId;

    console.log('💸 External transfer request:', { 
      userId, 
      amount, 
      fromAccount, 
      recipientEmail,
      recipientAccountNumber 
    });

    // Validate inputs
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid transfer amount',
      });
    }

    // Must provide either email OR account number + routing number
    if (!recipientEmail && (!recipientAccountNumber || !recipientRoutingNumber)) {
      return res.status(400).json({
        status: 'error',
        message: 'Recipient email or account/routing number is required',
      });
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid amount',
      });
    }

    // Get sender
    const sender = await User.findById(userId);
    if (!sender) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found',
      });
    }

    // Find recipient by email OR account number + routing number
    let recipient;
    if (recipientEmail) {
      recipient = await User.findOne({ email: recipientEmail.toLowerCase() });
    } else if (recipientAccountNumber && recipientRoutingNumber) {
      recipient = await User.findOne({ 
        accountNumber: recipientAccountNumber,
        routingNumber: recipientRoutingNumber 
      });
    }

    if (!recipient) {
      return res.status(404).json({
        status: 'error',
        message: 'Recipient not found. They must have an account with Aurora Bank.',
      });
    }

    // Check if trying to send to self
    if (sender._id.equals(recipient._id)) {
      return res.status(400).json({
        status: 'error',
        message: 'Cannot transfer to yourself. Use internal transfer instead.',
      });
    }

    // Initialize accounts if needed
    if (!sender.accounts || sender.accounts.length === 0) {
      sender.accounts = [
        { accountType: 'checking', balance: sender.balance || 0 },
        { accountType: 'savings', balance: 0 }
      ];
    }

    // Check balance
    const sourceAccount = fromAccount || 'checking';
    const fromAccountObj = sender.accounts.find(a => a.accountType === sourceAccount);
    const fromBalance = fromAccountObj?.balance || 0;

    if (fromBalance < numericAmount) {
      return res.status(400).json({
        status: 'error',
        message: `Insufficient funds in ${sourceAccount}. Available: $${fromBalance.toFixed(2)}`,
      });
    }

    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const reference = `EXT-${userId.toString().substring(0, 8)}-${Date.now()}-${randomId}`;

    // Deduct from sender immediately and create pending transaction
    const senderTransaction = await Transaction.create({
      userId: sender._id,
      amount: -numericAmount,
      description: `Transfer to ${recipient.firstName} ${recipient.lastName}`,
      category: 'External Transfer',
      accountType: sourceAccount,
      status: 'pending', // Pending approval
      transferType: 'external',
      reference,
      note: note || '',
      date: new Date(),
      recipientMeta: {
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        recipientEmail: recipient.email,
        recipientId: recipient._id,
        recipientAccountNumber: recipient.accountNumber,
        recipientRoutingNumber: recipient.routingNumber,
      },
    });

    // Create pending incoming transaction for recipient (not applied yet)
    const recipientTransaction = await Transaction.create({
      userId: recipient._id,
      amount: numericAmount,
      description: `Transfer from ${sender.firstName} ${sender.lastName}`,
      category: 'External Transfer',
      accountType: 'checking', // Default to checking for incoming
      status: 'pending', // Pending approval
      transferType: 'external',
      reference,
      note: note || '',
      date: new Date(),
      recipientMeta: {
        senderId: sender._id,
        senderName: `${sender.firstName} ${sender.lastName}`,
        senderEmail: sender.email,
        senderAccountNumber: sender.accountNumber,
        senderRoutingNumber: sender.routingNumber,
      },
    });

    // Deduct from sender's account immediately (funds on hold)
    const fromIndex = sender.accounts.findIndex(a => a.accountType === sourceAccount);
    if (fromIndex !== -1) {
      sender.accounts[fromIndex].balance -= numericAmount;
    }

    // Recalculate total balance
    sender.balance = sender.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    sender.markModified('accounts');
    await sender.save();

    console.log('✅ External transfer created (pending approval)');

    res.json({
      status: 'success',
      message: 'Transfer submitted for approval. Funds will be released once approved by admin.',
      transfer: {
        reference,
        amount: numericAmount,
        fromAccount: sourceAccount,
        recipientName: `${recipient.firstName} ${recipient.lastName}`,
        recipientEmail: recipient.email,
        recipientAccountNumber: recipient.accountNumber,
        recipientRoutingNumber: recipient.routingNumber,
        status: 'pending',
        date: new Date(),
      },
      senderTransaction: {
        id: senderTransaction._id,
        amount: senderTransaction.amount,
        status: 'pending',
      },
      recipientTransaction: {
        id: recipientTransaction._id,
        amount: recipientTransaction.amount,
        status: 'pending',
      },
    });
  } catch (error) {
    console.error('❌ External transfer error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Server error processing transfer',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get beneficiaries (saved recipients)
exports.getBeneficiaries = async (req, res) => {
  try {
    const userId = req.userId;

    // Get recent external transfers to build beneficiary list
    const recentTransfers = await Transaction.find({
      userId,
      transferType: 'external',
      'recipientMeta.recipientEmail': { $exists: true },
    })
      .sort({ date: -1 })
      .limit(10)
      .lean();

    // Extract unique recipients
    const beneficiaries = [];
    const seen = new Set();

    for (const tx of recentTransfers) {
      const email = tx.recipientMeta?.recipientEmail;
      if (email && !seen.has(email)) {
        seen.add(email);
        beneficiaries.push({
          id: email,
          name: tx.recipientMeta.recipientName || 'Unknown',
          email: email,
          lastUsed: tx.date,
        });
      }
    }

    res.json({
      status: 'success',
      beneficiaries,
    });
  } catch (error) {
    console.error('❌ Get beneficiaries error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching beneficiaries',
    });
  }
};

// Add beneficiary (placeholder - currently auto-populated from transfers)
exports.addBeneficiary = async (req, res) => {
  res.json({
    status: 'success',
    message: 'Beneficiaries are automatically added when you make transfers',
  });
};

// Delete beneficiary (placeholder)
exports.deleteBeneficiary = async (req, res) => {
  res.json({
    status: 'success',
    message: 'Beneficiary management coming soon',
  });
};
