// src/controllers/transactionController.js
const crypto = require('crypto');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { sendNotificationEmail } = require('../utils/email');
const { withDatabaseTransaction } = require('../utils/withDatabaseTransaction');

class ApprovalError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sessionOptions = (session) => (session ? { session } : {});
const queryWithSession = (query, session) => (session ? query.session(session) : query);
const money = (value) => Number(Number(value || 0).toFixed(2));
const idsMatch = (left, right) => String(left) === String(right);
const createTransactionReference = (userId) => {
  const random = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : crypto.randomBytes(16).toString('hex');
  return `TXN-${String(userId).slice(-8)}-${random.slice(0, 20).toUpperCase()}`;
};

const ensureAccounts = (user) => {
  if (!Array.isArray(user.accounts) || user.accounts.length === 0) {
    user.accounts = [
      { accountType: 'checking', balance: money(user.balance) },
      { accountType: 'savings', balance: 0 },
    ];
  }
  user.accounts.forEach((account) => {
    account.balance = money(account.balance);
  });
};

const accountFor = (user, accountType, createIfMissing = false) => {
  let account = user.accounts.find((item) => item.accountType === accountType);
  if (!account && createIfMissing) {
    user.accounts.push({ accountType, balance: 0 });
    account = user.accounts[user.accounts.length - 1];
  }
  return account;
};

const recalculateBalance = (user) => {
  user.balance = money(user.accounts.reduce((total, account) => total + Number(account.balance || 0), 0));
  user.markModified('accounts');
};

const externalGroupQuery = (transaction) => (
  transaction.transferReference
    ? { transferReference: transaction.transferReference }
    : { reference: transaction.reference }
);

const findExternalLegs = async (transaction, session) => {
  if (!transaction.transferReference && !transaction.reference) {
    throw new ApprovalError(409, 'This transfer has no reference and cannot be settled automatically.');
  }

  const legs = await queryWithSession(
    Transaction.find({ ...externalGroupQuery(transaction), transferType: 'external' }),
    session
  );
  const debit = legs.find((item) => Number(item.amount) < 0);
  const credit = legs.find((item) => Number(item.amount) > 0);

  if (!debit || !credit) {
    throw new ApprovalError(409, 'This transfer is missing its matching ledger entry and cannot be settled automatically.');
  }
  if (!idsMatch(debit._id, transaction._id)) {
    throw new ApprovalError(409, 'Approve or reject the sender’s outgoing transfer entry, not the recipient credit entry.');
  }
  if (money(Math.abs(Number(debit.amount))) !== money(credit.amount) || idsMatch(debit.userId, credit.userId)) {
    throw new ApprovalError(409, 'This transfer has invalid matching ledger entries and cannot be settled automatically.');
  }
  if (debit.status !== 'pending' || credit.status !== 'pending') {
    throw new ApprovalError(409, 'This transfer has already been processed.');
  }

  return { debit, credit };
};

const notify = async (email, subject, message) => {
  if (!email) return;
  try {
    await sendNotificationEmail(email, subject, message);
  } catch (error) {
    console.error('Failed to send transaction email:', error.message);
  }
};

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

    // Date.now() alone collides when two legitimate ledger writes land in
    // the same millisecond. Use cryptographic entropy to satisfy the unique
    // reference index under concurrent requests.
    const reference = createTransactionReference(req.userId);

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

        try {
          await sendNotificationEmail(
            user.email,
            'Aurora Bank transaction update',
            `Your transaction "${description}" has been completed for ${Number(amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}.`
          );
        } catch (emailError) {
          console.error('⚠️ Failed to send transaction email:', emailError.message);
        }
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

// Standalone MongoDB cannot run multi-document transactions. Claim the sender
// debit with a compare-and-set transition before changing any balance, so two
// admin clicks (or an approve/reject race) cannot settle the same transfer
// twice. If no balance has changed yet, a failed attempt is returned to
// pending so it remains reviewable.
const settleExternalTransferStandalone = async (transactionId, action) => {
  const requested = await Transaction.findById(transactionId);
  if (!requested) throw new ApprovalError(404, 'Transaction not found.');
  if (requested.transferType !== 'external') {
    throw new ApprovalError(400, 'This is not an external transfer.');
  }

  await findExternalLegs(requested);
  const debit = await Transaction.findOneAndUpdate(
    { _id: requested._id, transferType: 'external', amount: { $lt: 0 }, status: 'pending' },
    { $set: { status: 'processing' } },
    { new: true }
  );
  if (!debit) {
    throw new ApprovalError(409, 'This transfer is already being processed or has already been processed.');
  }

  let credit;
  let balanceChanged = false;
  try {
    credit = await Transaction.findOneAndUpdate(
      { ...externalGroupQuery(debit), transferType: 'external', amount: { $gt: 0 }, status: 'pending' },
      { $set: { status: 'processing' } },
      { new: true }
    );
    if (!credit || money(Math.abs(Number(debit.amount))) !== money(credit.amount) || idsMatch(debit.userId, credit.userId)) {
      throw new ApprovalError(409, 'This transfer is missing valid matching ledger entries and cannot be settled automatically.');
    }

    const sender = await User.findById(debit.userId);
    const recipient = await User.findById(credit.userId);
    if (!sender || !recipient) {
      throw new ApprovalError(409, 'A transfer participant no longer exists, so this transfer cannot be settled automatically.');
    }

    if (action === 'approve') {
      ensureAccounts(recipient);
      const destination = accountFor(recipient, credit.accountType, true);
      destination.balance = money(destination.balance + Number(credit.amount));
      recalculateBalance(recipient);
      await recipient.save();
    } else {
      ensureAccounts(sender);
      const source = accountFor(sender, debit.accountType, true);
      source.balance = money(source.balance + Math.abs(Number(debit.amount)));
      recalculateBalance(sender);
      await sender.save();
    }
    balanceChanged = true;

    const finalStatus = action === 'approve' ? 'completed' : 'rejected';
    await Transaction.updateMany(
      { _id: { $in: [debit._id, credit._id] }, status: 'processing' },
      { $set: { status: finalStatus } }
    );
    debit.status = finalStatus;
    credit.status = finalStatus;
    return { debit, credit, sender, recipient };
  } catch (error) {
    if (!balanceChanged) {
      const ids = [debit._id];
      if (credit?._id) ids.push(credit._id);
      await Transaction.updateMany(
        { _id: { $in: ids }, status: 'processing' },
        { $set: { status: 'pending' } }
      ).catch(() => {});
    }
    throw error;
  }
};

const settleExternalTransfer = async (transactionId, action) => withDatabaseTransaction(async (session) => {
  if (!session) return settleExternalTransferStandalone(transactionId, action);

  const requested = await queryWithSession(Transaction.findById(transactionId), session);
  if (!requested) throw new ApprovalError(404, 'Transaction not found.');
  if (requested.transferType !== 'external') {
    throw new ApprovalError(400, 'This is not an external transfer.');
  }

  const { debit, credit } = await findExternalLegs(requested, session);
  const sender = await queryWithSession(User.findById(debit.userId), session);
  const recipient = await queryWithSession(User.findById(credit.userId), session);
  if (!sender || !recipient) {
    throw new ApprovalError(409, 'A transfer participant no longer exists, so this transfer cannot be settled automatically.');
  }

  if (action === 'approve') {
    ensureAccounts(recipient);
    const destination = accountFor(recipient, credit.accountType, true);
    destination.balance = money(destination.balance + Number(credit.amount));
    recalculateBalance(recipient);

    debit.status = 'completed';
    credit.status = 'completed';
    await recipient.save(sessionOptions(session));
  } else {
    ensureAccounts(sender);
    const source = accountFor(sender, debit.accountType, true);
    source.balance = money(source.balance + Math.abs(Number(debit.amount)));
    recalculateBalance(sender);

    debit.status = 'rejected';
    credit.status = 'rejected';
    await sender.save(sessionOptions(session));
  }

  await debit.save(sessionOptions(session));
  await credit.save(sessionOptions(session));

  return { debit, credit, sender, recipient };
});

const settleStandardTransactionStandalone = async (transactionId, action) => {
  const transaction = await Transaction.findOneAndUpdate(
    { _id: transactionId, status: 'pending' },
    { $set: { status: 'processing' } },
    { new: true }
  );
  if (!transaction) {
    throw new ApprovalError(409, 'Transaction is already being processed or has already been processed.');
  }

  let balanceChanged = false;
  try {
    let user = await User.findById(transaction.userId);
    if (action === 'approve') {
      if (!user) throw new ApprovalError(404, 'Transaction owner not found.');
      ensureAccounts(user);
      const account = accountFor(user, transaction.accountType, true);
      account.balance = money(account.balance + Number(transaction.amount));
      recalculateBalance(user);
      await user.save();
      balanceChanged = true;
    }

    transaction.status = action === 'approve' ? 'completed' : 'rejected';
    await transaction.save();
    return { transaction, user };
  } catch (error) {
    if (!balanceChanged) {
      await Transaction.updateOne(
        { _id: transaction._id, status: 'processing' },
        { $set: { status: 'pending' } }
      ).catch(() => {});
    }
    throw error;
  }
};

const settleStandardTransaction = async (transactionId, action) => withDatabaseTransaction(async (session) => {
  if (!session) return settleStandardTransactionStandalone(transactionId, action);

  const transaction = await queryWithSession(Transaction.findById(transactionId), session);
  if (!transaction) throw new ApprovalError(404, 'Transaction not found.');
  if (transaction.status !== 'pending') {
    throw new ApprovalError(409, 'Transaction has already been processed.');
  }

  if (action === 'approve') {
    const user = await queryWithSession(User.findById(transaction.userId), session);
    if (!user) throw new ApprovalError(404, 'Transaction owner not found.');
    ensureAccounts(user);
    const account = accountFor(user, transaction.accountType, true);
    account.balance = money(account.balance + Number(transaction.amount));
    recalculateBalance(user);
    transaction.status = 'completed';
    await user.save(sessionOptions(session));
    await transaction.save(sessionOptions(session));
    return { transaction, user };
  }

  transaction.status = 'rejected';
  await transaction.save(sessionOptions(session));
  return { transaction, user: await queryWithSession(User.findById(transaction.userId), session) };
});

// Approve a pending transaction. External transfers are always settled as an
// all-or-nothing debit/credit pair; the recipient entry is never independently
// actionable, which prevents an accidental second debit or credit.
exports.approveTransaction = async (req, res) => {
  try {
    const requested = await Transaction.findById(req.params.id);
    if (!requested) return res.status(404).json({ message: 'Transaction not found.' });

    const result = requested.transferType === 'external'
      ? await settleExternalTransfer(req.params.id, 'approve')
      : await settleStandardTransaction(req.params.id, 'approve');

    if (requested.transferType === 'external') {
      const amount = Number(result.credit.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      await Promise.all([
        notify(result.sender.email, 'Aurora Bank transfer approved', `Your transfer of ${amount} has been approved and completed.`),
        notify(result.recipient.email, 'Aurora Bank transfer received', `Your account has been credited with ${amount}.`),
      ]);
      return res.json({
        message: 'External transfer approved and recipient credited.',
        transaction: result.debit,
        recipientTransaction: result.credit,
        transferReference: result.debit.transferReference || result.debit.reference,
      });
    }

    await notify(
      result.user?.email,
      'Aurora Bank transaction approved',
      `Your transaction "${result.transaction.description}" has been approved and completed.`
    );
    return res.json({ message: 'Transaction approved.', transaction: result.transaction });
  } catch (error) {
    console.error('Approve transaction error:', error);
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error approving transaction.' });
  }
};

// Reject a pending transaction. Rejecting an external transfer rejects both
// ledger entries and releases the held sender funds exactly once.
exports.rejectTransaction = async (req, res) => {
  try {
    const requested = await Transaction.findById(req.params.id);
    if (!requested) return res.status(404).json({ message: 'Transaction not found.' });

    const result = requested.transferType === 'external'
      ? await settleExternalTransfer(req.params.id, 'reject')
      : await settleStandardTransaction(req.params.id, 'reject');

    if (requested.transferType === 'external') {
      const amount = Number(Math.abs(result.debit.amount)).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
      await Promise.all([
        notify(result.sender.email, 'Aurora Bank transfer rejected', `Your transfer of ${amount} was rejected and the held funds were returned to your account.`),
        notify(result.recipient.email, 'Aurora Bank transfer rejected', 'An incoming transfer to your account was rejected.'),
      ]);
      return res.json({
        message: 'External transfer rejected and sender refunded.',
        transaction: result.debit,
        recipientTransaction: result.credit,
        transferReference: result.debit.transferReference || result.debit.reference,
      });
    }

    await notify(
      result.user?.email,
      'Aurora Bank transaction rejected',
      `Your transaction "${result.transaction.description}" was rejected.`
    );
    return res.json({ message: 'Transaction rejected.', transaction: result.transaction });
  } catch (error) {
    console.error('Reject transaction error:', error);
    return res.status(error.status || 500).json({ message: error.status ? error.message : 'Server error rejecting transaction.' });
  }
};

// Get all pending transactions (admin only)
exports.getPendingTransactions = async (req, res) => {
  try {
    // An external transfer has a sender debit and a recipient credit. Only
    // the sender debit is actionable; exposing both created two approval
    // buttons for one transfer and allowed the credit leg to be settled as if
    // it were the sender's payment.
    const transactions = await Transaction.find({
      status: 'pending',
      $or: [
        { transferType: { $ne: 'external' } },
        { transferType: 'external', amount: { $lt: 0 } },
      ],
    })
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

    await sendNotificationEmail(receiverEmail, 'Aurora Bank transfer on hold', message);

    return res.json({ message: 'Receiver notified', detail: message });
  } catch (error) {
    console.error('Notify receiver error:', error);
    res.status(500).json({ message: 'Server error notifying receiver' });
  }
};
