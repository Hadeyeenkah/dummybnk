// src/controllers/transactionController.js
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { sendVerificationEmail } = require('../utils/email');

// Create a new transaction
exports.createTransaction = async (req, res) => {
  try {
    const {
      amount,
      description,
      category,
      accountType,
      status,
      transferType,
      recipientMeta,
      note,
      date,
    } = req.body;

    // Generate unique reference
    const reference = `${req.userId}-${Date.now()}`;

    const transaction = await Transaction.create({
      userId: req.userId,
      amount,
      description,
      category: category || 'Other',
      accountType: accountType || 'checking',
      status: status || 'completed',
      transferType: transferType || 'external',
      recipientMeta: recipientMeta || {},
      note: note || '',
      date: date || new Date(),
      reference,
    });

    // If transaction is completed (not pending), update user balance
    if (transaction.status === 'completed') {
      const user = await User.findById(req.userId);
      if (user) {
        // Update balance
        user.balance = (user.balance || 0) + amount;

        // Update specific account
        const account = user.accounts?.find((a) => a.accountType === accountType);
        if (account) {
          account.balance = (account.balance || 0) + amount;
        } else if (user.accounts) {
          user.accounts.push({
            accountType,
            balance: amount,
            accountNumber: `****${Math.floor(1000 + Math.random() * 9000)}`,
          });
        }

        await user.save();
      }
    }

    res.status(201).json({
      message: 'Transaction created',
      transaction,
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error creating transaction' });
  }
};

// Get all transactions for the current user
exports.getTransactions = async (req, res) => {
  try {
    const { status, limit = 50, skip = 0 } = req.query;

    const query = { userId: req.userId };
    if (status) {
      query.status = status;
    }

    const transactions = await Transaction.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    res.json({ transactions });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error fetching transactions' });
  }
};

// Get single transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ transaction });
  } catch (error) {
    console.error('Get transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Approve pending transaction (admin only)
exports.approveTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    transaction.status = 'completed';
    await transaction.save();

    // Update user balance
    const user = await User.findById(transaction.userId);
    if (user) {
      user.balance = (user.balance || 0) + transaction.amount;

      const account = user.accounts?.find((a) => a.accountType === transaction.accountType);
      if (account) {
        account.balance = (account.balance || 0) + transaction.amount;
      }

      await user.save();
    }

    res.json({
      message: 'Transaction approved',
      transaction,
    });
  } catch (error) {
    console.error('Approve transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Reject pending transaction (admin only)
exports.rejectTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.status !== 'pending') {
      return res.status(400).json({ message: 'Transaction is not pending' });
    }

    transaction.status = 'rejected';
    await transaction.save();

    res.json({
      message: 'Transaction rejected',
      transaction,
    });
  } catch (error) {
    console.error('Reject transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get all pending transactions (admin only)
exports.getPendingTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ status: 'pending' })
      .populate('userId', 'firstName lastName email')
      .sort({ date: -1 });

    res.json({ transactions });
  } catch (error) {
    console.error('Get pending transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Notify receiver via email that a transfer is initiated and on hold for security review
exports.notifyReceiver = async (req, res) => {
  try {
    const { receiverEmail, senderName, amount, note } = req.body;

    if (!receiverEmail || !senderName || !amount) {
      return res.status(400).json({ message: 'receiverEmail, senderName, and amount are required' });
    }

    const safeAmount = Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const message = `You have a pending transfer of ${safeAmount} from ${senderName}. This transfer is currently on hold for security review. ${note ? 'Note: ' + note : ''}`;

    await sendVerificationEmail(receiverEmail, message);

    return res.json({ message: 'Receiver notified', detail: message });
  } catch (error) {
    console.error('Notify receiver error:', error);
    res.status(500).json({ message: 'Server error notifying receiver' });
  }
};
