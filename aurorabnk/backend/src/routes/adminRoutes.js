const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { protect, requireRole } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const MarketSettings = require('../models/MarketSettings');
const { getUserTradeTotal: getUserTradeTotals } = require('../utils/marketTotals');
const { ChatConversation, ChatMessage } = require('../models/Chat');
const { sendNotificationEmail } = require('../utils/email');

// Keep this wrapper so the fields used below remain easy to read while the
// aggregation itself is shared with the customer market endpoint.
const getUserTradeTotal = async (userId) => {
  const { estimatedTradeTotal } = await getUserTradeTotals(userId);
  return estimatedTradeTotal;
};

// Get all users
router.get('/users', protect, requireRole('admin'), async (req, res) => {
  console.log('[ADMIN] GET /users', { ip: req.ip, time: new Date().toISOString(), user: req.userId });
  try {
    console.log('Admin: Fetching all users...');
    const users = await User.find().select('-password');
    console.log(`Admin: Found ${users.length} users`);

    const marketSettings = await MarketSettings.findOne({ key: 'primary' });
    const globalReturnPercent = Number(marketSettings?.todaysReturnPercent ?? 10.5);

    // Fetch transactions and today's return for each user
    const usersWithTransactions = await Promise.all(
      users.map(async (user) => {
        const transactions = await Transaction.find({ userId: user._id }).sort({ date: -1 });

        const checking = user.accounts?.find(a => a.accountType === 'checking')?.balance || 0;
        const savings = user.accounts?.find(a => a.accountType === 'savings')?.balance || 0;

        // Same auto-vs-override logic as /market/overview: if this user has
        // no manual override, their return is calculated live from what
        // they actually have on trade today × the global rate.
        const estimatedTradeTotal = await getUserTradeTotal(user._id);
        const hasReturnOverride = Number.isFinite(user.todaysReturnOverride);
        const todaysReturn = hasReturnOverride
          ? user.todaysReturnOverride
          : Number((estimatedTradeTotal * globalReturnPercent / 100).toFixed(2));
        const todaysReturnPercent = hasReturnOverride
          ? Number((estimatedTradeTotal > 0 ? (user.todaysReturnOverride / estimatedTradeTotal) * 100 : 0).toFixed(2))
          : globalReturnPercent;

        return {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          // Do not fabricate a new account suffix on every admin refresh.
          // Aside from being misleading, it made a stable account look as if
          // it changed every five seconds in the dashboard.
          accountNumber: user.accountNumber ? `****${String(user.accountNumber).slice(-4)}` : '—',
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
          approvalStatus: user.approvalStatus,
          estimatedTradeTotal,
          todaysReturn,
          todaysReturnPercent,
          hasReturnOverride,
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

router.get('/pending-users', protect, requireRole('admin'), async (_req, res) => {
  try {
    const users = await User.find({ role: 'user', approvalStatus: 'pending' })
      .select('firstName lastName email createdAt isVerified')
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      users: users.map((user) => ({
        id: user._id,
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        createdAt: user.createdAt,
        isVerified: user.isVerified,
      })),
    });
  } catch (error) {
    console.error('Get pending users error:', error);
    res.status(500).json({ message: 'Unable to load pending user registrations.' });
  }
});

router.patch('/users/:userId/approval', protect, requireRole('admin'), async (req, res) => {
  const { userId } = req.params;
  const { approvalStatus } = req.body || {};
  if (!mongoose.isValidObjectId(userId)) {
    return res.status(400).json({ message: 'Invalid user ID.' });
  }
  if (!['approved', 'declined'].includes(approvalStatus)) {
    return res.status(400).json({ message: 'Approval status must be approved or declined.' });
  }

  try {
    const user = await User.findOneAndUpdate(
      { _id: userId, role: 'user', approvalStatus: 'pending' },
      { $set: { approvalStatus } },
      { new: true, runValidators: true }
    ).select('firstName lastName email approvalStatus');

    if (user) {
      return res.json({
        message: approvalStatus === 'approved' ? 'User account approved.' : 'User registration declined.',
        user: {
          id: user._id,
          name: `${user.firstName} ${user.lastName}`,
          email: user.email,
          approvalStatus: user.approvalStatus,
        },
      });
    }

    const existingUser = await User.findById(userId).select('approvalStatus role');
    if (!existingUser || existingUser.role === 'admin') {
      return res.status(404).json({ message: 'Pending user registration not found.' });
    }
    return res.status(409).json({ message: 'This user registration has already been reviewed.' });
  } catch (error) {
    console.error('Update user approval error:', error);
    res.status(500).json({ message: 'Unable to update user approval.' });
  }
});

// Update user balance
router.patch('/users/:userId/balance', protect, requireRole('admin'), async (req, res) => {
  console.log('[ADMIN] PATCH /users/:userId/balance', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params, body: req.body });
  try {
    const { userId } = req.params;
    const { checking, savings } = req.body;

    if (!Number.isFinite(checking) || !Number.isFinite(savings)) {
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

// Set (or clear) a per-user override for today's return. Send
// { todaysReturn: <number> } to set it, or { todaysReturn: null } to clear
// it and go back to the automatic calculation (trade total × global rate).
// The % is never taken from the request — it's always derived from this
// user's real, current trade total so it can't go stale.
router.patch('/users/:userId/return', protect, requireRole('admin'), async (req, res) => {
  console.log('[ADMIN] PATCH /users/:userId/return', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params, body: req.body });
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (req.body.todaysReturn === null) {
      user.todaysReturnOverride = null;
    } else {
      const todaysReturn = Number(req.body.todaysReturn);
      if (!Number.isFinite(todaysReturn)) {
        return res.status(400).json({ message: 'todaysReturn must be a number (or null to clear the override).' });
      }
      user.todaysReturnOverride = todaysReturn;
    }
    await user.save();

    const estimatedTradeTotal = await getUserTradeTotal(user._id);
    const hasReturnOverride = Number.isFinite(user.todaysReturnOverride);
    let todaysReturn = user.todaysReturnOverride;
    let todaysReturnPercent = hasReturnOverride
      ? Number((estimatedTradeTotal > 0 ? (user.todaysReturnOverride / estimatedTradeTotal) * 100 : 0).toFixed(2))
      : null;

    if (!hasReturnOverride) {
      const marketSettings = await MarketSettings.findOne({ key: 'primary' });
      const globalReturnPercent = Number(marketSettings?.todaysReturnPercent ?? 10.5);
      todaysReturn = Number((estimatedTradeTotal * globalReturnPercent / 100).toFixed(2));
      todaysReturnPercent = globalReturnPercent;
    }

    res.json({
      message: hasReturnOverride ? 'User return override saved.' : 'Override cleared — this user is back to the automatic return.',
      user: {
        id: user._id,
        todaysReturn,
        todaysReturnPercent,
        estimatedTradeTotal,
        hasReturnOverride,
      },
    });
  } catch (error) {
    console.error('Update user return error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all pending approvals
router.get('/pending-approvals', protect, requireRole('admin'), async (req, res) => {
  console.log('[ADMIN] GET /pending-approvals', { ip: req.ip, time: new Date().toISOString(), user: req.userId });
  try {
    console.log('Admin: Fetching pending approvals...');
    // Only sender debits are actionable; Aurora recipient credits must not
    // create a second approval action for the same transfer.
    const pendingTransactions = await Transaction.find({
      status: 'pending',
      $or: [
        { transferType: { $ne: 'external' } },
        { transferType: 'external', amount: { $lt: 0 } },
      ],
    })
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
      reference: transaction.transferReference || transaction.reference,
      recipient: transaction.recipientMeta?.externalBank ? {
        name: transaction.recipientMeta.recipientName,
        bankName: transaction.recipientMeta.bankName,
        email: transaction.recipientMeta.recipientEmail,
        accountNumber: transaction.recipientMeta.recipientAccountNumber || transaction.recipientMeta.accountNumber,
        routingNumber: transaction.recipientMeta.recipientRoutingNumber || transaction.recipientMeta.routingNumber,
      } : null,
    }));

    res.json({ pendingApprovals });
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add transaction for a user (with backdating support)
router.post('/users/:userId/transactions', protect, requireRole('admin'), async (req, res) => {
  console.log('[ADMIN] POST /users/:userId/transactions', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params, body: req.body });
  try {
    const { userId } = req.params;
    const { description, amount, category, accountType, date, note } = req.body;

    const numericAmount = Number(amount);
    if (!description || !String(description).trim() || !Number.isFinite(numericAmount) || numericAmount === 0) {
      return res.status(400).json({ message: 'A description and a non-zero valid amount are required' });
    }
    if (!['checking', 'savings'].includes(accountType || 'checking')) {
      return res.status(400).json({ message: 'Account type must be checking or savings' });
    }
    if (date && Number.isNaN(new Date(date).getTime())) {
      return res.status(400).json({ message: 'Enter a valid transaction date' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create transaction with custom date (backdating)
    const transaction = await Transaction.create({
      userId: userId,
      description: String(description).trim(),
      amount: numericAmount,
      category: category || 'Other',
      accountType: accountType || 'checking',
      status: 'completed',
      date: date ? new Date(date) : new Date(),
      note: note || '',
      transferType: 'admin_adjustment',
      reference: `ADMIN-${userId}-${Date.now()}`,
    });

    // Update user balance
    user.accounts = Array.isArray(user.accounts) ? user.accounts : [];
    const targetAccount = accountType || 'checking';
    const accountIndex = user.accounts.findIndex(a => a.accountType === targetAccount);
    if (accountIndex !== -1) {
      user.accounts[accountIndex].balance = (user.accounts[accountIndex].balance || 0) + numericAmount;
    } else {
      user.accounts.push({
        accountType: targetAccount,
        accountNumber: `${targetAccount.toUpperCase()}-${Date.now()}`,
        balance: numericAmount,
      });
    }

    user.balance = user.accounts.reduce((total, account) => total + (account.balance || 0), 0);
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
  console.log('[ADMIN] PATCH /users/:userId/transactions/:transactionId', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params, body: req.body });
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

    user.accounts = Array.isArray(user.accounts) ? user.accounts : [];
    const oldAmount = transaction.amount;
    const oldAccountType = transaction.accountType;

    // Update transaction fields
    if (description !== undefined) transaction.description = description;
    if (category !== undefined) transaction.category = category;
    if (date !== undefined) transaction.date = new Date(date);

    // Handle amount and account type changes
    if (amount !== undefined || accountType !== undefined) {
      const newAmount = amount !== undefined ? Number(amount) : oldAmount;
      const newAccountType = accountType !== undefined ? accountType : oldAccountType;

      if (!Number.isFinite(newAmount) || newAmount === 0 || !['checking', 'savings'].includes(newAccountType)) {
        return res.status(400).json({ message: 'Enter a non-zero valid amount and account type' });
      }

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
  console.log('[ADMIN] DELETE /users/:userId/transactions/:transactionId', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params });
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
    user.accounts = Array.isArray(user.accounts) ? user.accounts : [];
    const accountIndex = user.accounts.findIndex(a => a.accountType === transaction.accountType);
    if (accountIndex !== -1) {
      user.accounts[accountIndex].balance -= transaction.amount;
    }

    user.balance = user.accounts.reduce((total, account) => total + (account.balance || 0), 0);
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
  console.log('[ADMIN] POST /users/:userId/messages', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params, body: req.body });
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

    try {
      await sendNotificationEmail(
        user.email,
        'You have a new Aurora Bank notification',
        `You received a new message from Aurora Bank support:\n\n${message.trim()}`
      );
    } catch (emailError) {
      console.error('⚠️ Failed to send notification email:', emailError.message);
    }

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
  console.log('[ADMIN] GET /users/:userId/messages', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params });
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
  console.log('[ADMIN] PATCH /users/:userId/messages/:messageId/read', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params });
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

// Edit user info (admin only)
router.patch('/users/:userId', protect, requireRole('admin'), async (req, res) => {
  console.log('[ADMIN] PATCH /users/:userId', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params, body: req.body });
  try {
    const { userId } = req.params;
    const updateFields = req.body;
    // Prevent password change here; use password endpoint
    if (updateFields.password) delete updateFields.password;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // Update basic fields
    ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth'].forEach(field => {
      if (updateFields[field] !== undefined) user[field] = updateFields[field];
    });
    // Update balances if provided
    if (typeof updateFields.checking === 'number' || typeof updateFields.savings === 'number') {
      const checking = typeof updateFields.checking === 'number' ? updateFields.checking : user.accounts?.find(a => a.accountType === 'checking')?.balance || 0;
      const savings = typeof updateFields.savings === 'number' ? updateFields.savings : user.accounts?.find(a => a.accountType === 'savings')?.balance || 0;
      user.accounts = [
        { accountType: 'checking', accountNumber: user.accounts?.find(a => a.accountType === 'checking')?.accountNumber || `CHK${Date.now()}`, balance: checking },
        { accountType: 'savings', accountNumber: user.accounts?.find(a => a.accountType === 'savings')?.accountNumber || `SAV${Date.now()}`, balance: savings },
      ];
      user.balance = checking + savings;
    }
    await user.save();
    res.json({ message: 'User updated successfully', user });
  } catch (error) {
    console.error('Admin edit user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user account (admin only)
router.delete('/users/:userId', protect, requireRole('admin'), async (req, res) => {
  console.log('[ADMIN] DELETE /users/:userId', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params });
  try {
    const { userId } = req.params;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Change any user's password (admin only)
const bcrypt = require('bcryptjs');
router.patch('/users/:userId/password', protect, requireRole('admin'), async (req, res) => {
  console.log('[ADMIN] PATCH /users/:userId/password', { ip: req.ip, time: new Date().toISOString(), user: req.userId, params: req.params });
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();
    res.json({ message: 'Password changed successfully for user.' });
  } catch (error) {
    console.error('Admin change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});
// Get all conversations for admin
router.get('/conversations', protect, requireRole('admin'), async (req, res) => {
  console.log('[ADMIN] GET /conversations', { ip: req.ip, time: new Date().toISOString(), user: req.userId });
  try {
    const conversations = await ChatConversation.find()
      .sort({ lastMessageTime: -1, createdAt: -1 });
    
    res.json({ success: true, conversations });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/conversations/:conversationId/messages', protect, requireRole('admin'), async (req, res) => {
  const { conversationId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    return res.status(400).json({ success: false, message: 'Invalid conversation ID' });
  }

  try {
    const conversation = await ChatConversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found' });
    }

    const result = await ChatMessage.deleteMany({ conversationId });
    conversation.lastMessage = '';
    conversation.lastMessageTime = null;
    conversation.unreadCount = 0;
    await conversation.save();

    return res.json({ success: true, deletedCount: result.deletedCount });
  } catch (error) {
    console.error('Clear conversation messages error:', error);
    return res.status(500).json({ success: false, message: 'Unable to clear conversation messages' });
  }
});

module.exports = router;
