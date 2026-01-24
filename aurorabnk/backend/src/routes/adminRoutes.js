const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { ChatConversation } = require('../models/Chat');

// Get all users
router.get('/users', protect, requireRole('admin'), async (req, res) => {
  try {
    console.log('Admin: Fetching all users...');
    const users = await User.find().select('-password');
    console.log(`Admin: Found ${users.length} users`);
    
    // Fetch transactions for each user
    const usersWithTransactions = await Promise.all(
      users.map(async (user) => {
        const transactions = await Transaction.find({ userId: user._id }).sort({ date: -1 });
        
        const checking = user.accounts?.find(a => a.accountType === 'checking')?.balance || 0;
        const savings = user.accounts?.find(a => a.accountType === 'savings')?.balance || 0;
        
        return {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          accountNumber: '****' + String(Math.floor(1000 + Math.random() * 9000)),
          balance: checking + savings,
          checking,
          savings,
          transactions: transactions.map(t => ({
            id: t._id,
            date: t.date ? new Date(t.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            description: t.description,
            amount: t.amount,
            category: t.category,
            status: t.status,
            accountType: t.accountType,
          })),
          pendingTransactions: transactions.filter(t => t.status === 'pending').map(t => ({
            id: t._id,
            date: t.date ? new Date(t.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            description: t.description,
            amount: t.amount,
            category: t.category,
            status: t.status,
            accountType: t.accountType,
          })),
          role: user.role,
        };
      })
    );

    console.log('Admin: Sending users data...');
    res.json({ users: usersWithTransactions });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user balance
router.patch('/users/:userId/balance', protect, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { checking, savings } = req.body;

    if (typeof checking !== 'number' || typeof savings !== 'number') {
      return res.status(400).json({ message: 'Checking and savings amounts are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update account balances
    user.accounts = [
      { accountType: 'checking', accountNumber: user.accounts?.find(a => a.accountType === 'checking')?.accountNumber || `CHK${Date.now()}`, balance: checking },
      { accountType: 'savings', accountNumber: user.accounts?.find(a => a.accountType === 'savings')?.accountNumber || `SAV${Date.now()}`, balance: savings },
    ];
    user.balance = checking + savings;

    await user.save();

    res.json({ 
      message: 'User balance updated successfully',
      user: {
        id: user._id,
        checking,
        savings,
        balance: user.balance,
      }
    });
  } catch (error) {
    console.error('Update balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all pending approvals
router.get('/pending-approvals', protect, requireRole('admin'), async (req, res) => {
  try {
    console.log('Admin: Fetching pending approvals...');
    const pendingTransactions = await Transaction.find({ status: 'pending' })
      .populate('userId', 'firstName lastName email')
      .sort({ date: -1 });

    console.log(`Admin: Found ${pendingTransactions.length} pending transactions`);

    const pendingApprovals = pendingTransactions.map(transaction => ({
      id: transaction._id,
      date: transaction.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      userName: transaction.userId ? `${transaction.userId.firstName} ${transaction.userId.lastName}` : 'Unknown User',
      userEmail: transaction.userId?.email || 'N/A',
      description: transaction.description,
      amount: transaction.amount,
      category: transaction.category,
      status: transaction.status,
      accountType: transaction.accountType,
    }));

    res.json({ pendingApprovals });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add transaction for a user (with backdating support)
router.post('/users/:userId/transactions', protect, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { description, amount, category, accountType, date, note } = req.body;

    if (!description || amount === undefined) {
      return res.status(400).json({ message: 'Description and amount are required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create transaction with custom date (backdating)
    const transaction = await Transaction.create({
      userId: userId,
      description,
      amount: parseFloat(amount),
      category: category || 'Other',
      accountType: accountType || 'checking',
      status: 'completed',
      date: date ? new Date(date) : new Date(),
      note: note || '',
      transferType: 'admin_adjustment',
      reference: `ADMIN-${userId}-${Date.now()}`,
    });

    // Update user balance
    const accountIndex = user.accounts.findIndex(a => a.accountType === accountType);
    if (accountIndex !== -1) {
      user.accounts[accountIndex].balance += parseFloat(amount);
    } else {
      user.accounts.push({
        accountType: accountType || 'checking',
        accountNumber: `${accountType.toUpperCase()}-${Date.now()}`,
        balance: parseFloat(amount),
      });
    }

    user.balance = (user.balance || 0) + parseFloat(amount);
    user.markModified('accounts');
    await user.save();

    res.status(201).json({
      message: 'Transaction added successfully',
      transaction: {
        id: transaction._id,
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category,
        accountType: transaction.accountType,
        date: transaction.date,
        status: transaction.status,
      },
    });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ message: 'Server error adding transaction' });
  }
});

// Edit transaction
router.patch('/users/:userId/transactions/:transactionId', protect, requireRole('admin'), async (req, res) => {
  try {
    const { userId, transactionId } = req.params;
    const { description, amount, category, accountType, date } = req.body;

    const transaction = await Transaction.findOne({ _id: transactionId, userId: userId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldAmount = transaction.amount;
    const oldAccountType = transaction.accountType;

    // Update transaction fields
    if (description !== undefined) transaction.description = description;
    if (category !== undefined) transaction.category = category;
    if (date !== undefined) transaction.date = new Date(date);

    // Handle amount and account type changes
    if (amount !== undefined || accountType !== undefined) {
      const newAmount = amount !== undefined ? parseFloat(amount) : oldAmount;
      const newAccountType = accountType !== undefined ? accountType : oldAccountType;

      // Adjust balances if amount or account type changed
      if (newAmount !== oldAmount || newAccountType !== oldAccountType) {
        // Reverse old transaction from old account
        const oldAccountIndex = user.accounts.findIndex(a => a.accountType === oldAccountType);
        if (oldAccountIndex !== -1) {
          user.accounts[oldAccountIndex].balance -= oldAmount;
        }

        // Add new transaction to new account
        const newAccountIndex = user.accounts.findIndex(a => a.accountType === newAccountType);
        if (newAccountIndex !== -1) {
          user.accounts[newAccountIndex].balance += newAmount;
        } else {
          user.accounts.push({
            accountType: newAccountType,
            accountNumber: `${newAccountType.toUpperCase()}-${Date.now()}`,
            balance: newAmount,
          });
        }

        // Update user balance
        user.balance = user.accounts.reduce((sum, acc) => sum + acc.balance, 0);
        transaction.amount = newAmount;
        transaction.accountType = newAccountType;
      }

      user.markModified('accounts');
    }

    await transaction.save();
    await user.save();

    res.json({
      message: 'Transaction updated successfully',
      transaction: {
        id: transaction._id,
        description: transaction.description,
        amount: transaction.amount,
        category: transaction.category,
        accountType: transaction.accountType,
        date: transaction.date,
        status: transaction.status,
      },
    });
  } catch (error) {
    console.error('Edit transaction error:', error);
    res.status(500).json({ message: 'Server error editing transaction' });
  }
});

// Delete transaction
router.delete('/users/:userId/transactions/:transactionId', protect, requireRole('admin'), async (req, res) => {
  try {
    const { userId, transactionId } = req.params;

    const transaction = await Transaction.findOne({ _id: transactionId, userId: userId });
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Reverse the balance change
    const accountIndex = user.accounts.findIndex(a => a.accountType === transaction.accountType);
    if (accountIndex !== -1) {
      user.accounts[accountIndex].balance -= transaction.amount;
    }

    user.balance = (user.balance || 0) - transaction.amount;
    user.markModified('accounts');
    await user.save();

    // Delete the transaction
    await Transaction.findByIdAndDelete(transactionId);

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Server error deleting transaction' });
  }
});

// Send message to user
router.post('/users/:userId/messages', protect, requireRole('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    console.log('📨 Admin sending message:', { userId, message: message?.substring(0, 50), adminId: req.userId });

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const user = await User.findById(userId);
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    // Add message to user's messages array
    user.messages.push({
      message: message.trim(),
      sender: 'Bank Admin',
      createdAt: new Date(),
      read: false,
    });

    await user.save();
    console.log('✅ Message saved successfully to user:', userId);

    res.status(201).json({
      message: 'Message sent successfully',
      data: {
        message: message,
        sender: 'Bank Admin',
        createdAt: new Date(),
        read: false,
      },
    });
  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({ message: 'Server error sending message' });
  }
});

// Get user messages
router.get('/users/:userId/messages', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('📬 User fetching messages. userId:', userId, 'requestUser:', req.userId);

    const user = await User.findById(userId).select('messages');
    if (!user) {
      console.error('❌ User not found:', userId);
      return res.status(404).json({ message: 'User not found' });
    }

    const sortedMessages = user.messages.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    console.log('✅ Found messages for user:', sortedMessages.length);
    
    res.json({
      messages: sortedMessages,
    });
  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({ message: 'Server error fetching messages' });
  }
});

// Mark message as read
router.patch('/users/:userId/messages/:messageId/read', protect, async (req, res) => {
  try {
    const { userId, messageId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const msgIndex = user.messages.findIndex(m => m._id.toString() === messageId);
    if (msgIndex === -1) {
      return res.status(404).json({ message: 'Message not found' });
    }

    user.messages[msgIndex].read = true;
    user.markModified('messages');
    await user.save();

    res.json({ message: 'Message marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all conversations for admin
router.get('/conversations', protect, requireRole('admin'), async (req, res) => {
  try {
    const conversations = await ChatConversation.find()
      .sort({ lastMessageTime: -1, createdAt: -1 });
    
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
