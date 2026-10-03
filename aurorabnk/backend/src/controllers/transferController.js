const crypto = require('crypto');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const { withDatabaseTransaction } = require('../utils/withDatabaseTransaction');

const ACCOUNT_TYPES = new Set(['checking', 'savings']);

class TransferRequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const sessionOptions = (session) => (session ? { session } : {});
const queryWithSession = (query, session) => (session ? query.session(session) : query);

const createTransferReference = (prefix, userId) => {
  const random = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID().replace(/-/g, '')
    : crypto.randomBytes(16).toString('hex');
  return `${prefix}-${String(userId).slice(-8)}-${random.slice(0, 20).toUpperCase()}`;
};

const money = (value) => Number(Number(value || 0).toFixed(2));

const parseAmount = (value) => {
  if (value === null || value === undefined || value === '') {
    throw new TransferRequestError(400, 'Enter a valid transfer amount.');
  }

  const raw = typeof value === 'string' ? value.trim() : value;
  if (typeof raw === 'string' && !/^\d+(?:\.\d{1,2})?$/.test(raw)) {
    throw new TransferRequestError(400, 'Transfer amounts must use no more than two decimal places.');
  }

  const amount = Number(raw);
  const cents = Math.round(amount * 100);
  if (!Number.isFinite(amount) || cents <= 0 || Math.abs(amount * 100 - cents) > 1e-7) {
    throw new TransferRequestError(400, 'Enter a valid transfer amount.');
  }

  return cents / 100;
};

const parseAccountType = (value, fallback) => {
  const accountType = value || fallback;
  if (!ACCOUNT_TYPES.has(accountType)) {
    throw new TransferRequestError(400, 'Select a valid checking or savings account.');
  }
  return accountType;
};

const parseNote = (value) => {
  if (value === undefined || value === null) return '';
  const note = String(value).trim();
  if (note.length > 500) {
    throw new TransferRequestError(400, 'Notes must be 500 characters or fewer.');
  }
  return note;
};

const parseIdempotencyKey = (req) => {
  const key = req.get('Idempotency-Key');
  if (!key) return null;

  const normalized = String(key).trim();
  if (!/^[A-Za-z0-9._:-]{8,128}$/.test(normalized)) {
    throw new TransferRequestError(400, 'Invalid Idempotency-Key header.');
  }
  return normalized;
};

const parseEmail = (value) => {
  const email = String(value || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new TransferRequestError(400, 'Enter a valid recipient email address.');
  }
  return email;
};

const parseDigits = (value, field, length) => {
  const normalized = String(value || '').trim();
  if (!new RegExp(`^\\d{${length}}$`).test(normalized)) {
    throw new TransferRequestError(400, `${field} must contain ${length} digits.`);
  }
  return normalized;
};

const parseAccountNumber = (value) => {
  const normalized = String(value || '').trim();
  if (!/^\d{4,17}$/.test(normalized)) {
    throw new TransferRequestError(400, 'Recipient account number must contain 4 to 17 digits.');
  }
  return normalized;
};

const parseRecipientName = (value) => {
  const name = String(value || '').trim();
  if (!name || name.length > 100) {
    throw new TransferRequestError(400, 'Enter the recipient’s full name (up to 100 characters).');
  }
  return name;
};

const parseBankName = (value) => {
  const bankName = String(value || '').trim();
  if (!bankName || bankName.length > 100) {
    throw new TransferRequestError(400, 'Enter the recipient’s bank name (up to 100 characters).');
  }
  return bankName;
};

const ensureAccounts = (user) => {
  if (!Array.isArray(user.accounts) || user.accounts.length === 0) {
    user.accounts = [
      { accountType: 'checking', balance: money(user.balance) },
      { accountType: 'savings', balance: 0 },
    ];
    return;
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

const findIdempotentDebit = async (userId, idempotencyKey, session) => {
  if (!idempotencyKey) return null;
  return queryWithSession(
    Transaction.findOne({ userId, idempotencyKey, transferRole: 'debit' }),
    session
  );
};

const groupQuery = (transaction) => (
  transaction.transferReference
    ? { transferReference: transaction.transferReference }
    : { reference: transaction.reference }
);

const findCounterpart = async (transaction, role, session) => {
  const filter = {
    ...groupQuery(transaction),
    transferRole: role,
  };
  return queryWithSession(Transaction.findOne(filter), session);
};

const transactionSummary = (transaction) => ({
  id: transaction?._id,
  amount: transaction?.amount,
  status: transaction?.status,
});

const transferBalanceSummary = (user) => ({
  checking: money(accountFor(user, 'checking')?.balance),
  savings: money(accountFor(user, 'savings')?.balance),
  total: money(user.balance),
});

const internalResponse = (debit, credit, user, idempotent = false) => ({
  status: 'success',
  message: debit.status === 'completed'
    ? 'Transfer completed successfully.'
    : `Transfer is ${debit.status}.`,
  ...(idempotent ? { idempotent: true } : {}),
  transfer: {
    reference: debit.transferReference || debit.reference,
    amount: Math.abs(Number(debit.amount)),
    fromAccount: debit.accountType,
    toAccount: credit?.accountType,
    status: debit.status,
    date: debit.date,
  },
  debitTransaction: transactionSummary(debit),
  creditTransaction: transactionSummary(credit),
  ...(user ? { balances: transferBalanceSummary(user) } : {}),
});

const externalResponse = (debit, credit, user, idempotent = false) => {
  const recipient = debit.recipientMeta || {};
  return {
    status: 'success',
    message: debit.status === 'pending'
      ? 'Transfer submitted for approval. Funds are on hold until an administrator approves or rejects it.'
      : `Transfer is ${debit.status}.`,
    ...(idempotent ? { idempotent: true } : {}),
    transfer: {
      reference: debit.transferReference || debit.reference,
      amount: Math.abs(Number(debit.amount)),
      fromAccount: debit.accountType,
      recipientName: recipient.recipientName || 'Aurora Bank recipient',
      recipientBankName: recipient.bankName || 'Aurora Bank',
      recipientEmail: recipient.recipientEmail,
      recipientAccountNumber: recipient.recipientAccountNumber || recipient.accountNumber,
      recipientRoutingNumber: recipient.recipientRoutingNumber || recipient.routingNumber,
      status: debit.status,
      date: debit.date,
    },
    senderTransaction: transactionSummary(debit),
    recipientTransaction: transactionSummary(credit),
    ...(user ? { balances: transferBalanceSummary(user) } : {}),
  };
};

const respondWithExistingTransfer = async (res, debit) => {
  const credit = await findCounterpart(debit, 'credit');
  const payload = debit.transferType === 'internal'
    ? internalResponse(debit, credit, null, true)
    : externalResponse(debit, credit, null, true);
  return res.status(200).json(payload);
};

const duplicateKeyError = (error) => error?.code === 11000 || /duplicate key/i.test(error?.message || '');

// Internal transfer (between the signed-in user's accounts) — instant and
// represented by two linked, individually unique ledger records.
exports.internalTransfer = async (req, res) => {
  let idempotencyKey;
  try {
    const userId = req.userId;
    const amount = parseAmount(req.body.amount);
    const fromAccount = parseAccountType(req.body.fromAccount);
    const toAccount = parseAccountType(req.body.toAccount);
    const note = parseNote(req.body.note);
    idempotencyKey = parseIdempotencyKey(req);

    if (fromAccount === toAccount) {
      throw new TransferRequestError(400, 'Choose a different destination account.');
    }

    const existing = await findIdempotentDebit(userId, idempotencyKey);
    if (existing) return respondWithExistingTransfer(res, existing);

    const transferReference = createTransferReference('INT', userId);
    const result = await withDatabaseTransaction(async (session) => {
      const duplicate = await findIdempotentDebit(userId, idempotencyKey, session);
      if (duplicate) {
        return {
          idempotent: true,
          debit: duplicate,
          credit: await findCounterpart(duplicate, 'credit', session),
        };
      }

      const user = await queryWithSession(User.findById(userId), session);
      if (!user) throw new TransferRequestError(404, 'User not found.');

      ensureAccounts(user);
      const source = accountFor(user, fromAccount);
      const destination = accountFor(user, toAccount, true);
      if (!source) throw new TransferRequestError(400, `Your ${fromAccount} account is unavailable.`);
      if (money(source.balance) < amount) {
        throw new TransferRequestError(400, `Insufficient funds in ${fromAccount}. Available: $${money(source.balance).toFixed(2)}`);
      }

      source.balance = money(source.balance - amount);
      destination.balance = money(destination.balance + amount);
      recalculateBalance(user);

      const now = new Date();
      const idempotency = idempotencyKey ? { idempotencyKey } : {};
      const [debit, credit] = await Transaction.insertMany([
        {
          userId,
          amount: -amount,
          description: `Transfer to ${toAccount}`,
          category: 'Internal Transfer',
          accountType: fromAccount,
          status: 'completed',
          transferType: 'internal',
          reference: `${transferReference}-D`,
          transferReference,
          transferRole: 'debit',
          note,
          date: now,
          ...idempotency,
        },
        {
          userId,
          amount,
          description: `Transfer from ${fromAccount}`,
          category: 'Internal Transfer',
          accountType: toAccount,
          status: 'completed',
          transferType: 'internal',
          reference: `${transferReference}-C`,
          transferReference,
          transferRole: 'credit',
          note,
          date: now,
          ...idempotency,
        },
      ], sessionOptions(session));

      try {
        await user.save(sessionOptions(session));
      } catch (error) {
        // A real transaction will roll this back. In the standalone-Mongo
        // compatibility path, remove the newly-created ledger rows as well.
        if (!session) {
          await Transaction.deleteMany({ _id: { $in: [debit._id, credit._id] } }).catch(() => {});
        }
        throw error;
      }

      return { debit, credit, user };
    });

    if (result.idempotent) {
      return res.status(200).json(internalResponse(result.debit, result.credit, null, true));
    }

    return res.status(201).json(internalResponse(result.debit, result.credit, result.user));
  } catch (error) {
    if (duplicateKeyError(error) && idempotencyKey) {
      const existing = await findIdempotentDebit(req.userId, idempotencyKey).catch(() => null);
      if (existing) return respondWithExistingTransfer(res, existing);
    }
    console.error('Internal transfer error:', error);
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.status ? error.message : 'Server error processing transfer.',
    });
  }
};

// External transfers debit the sender into a hold immediately. Aurora
// recipients receive a paired pending credit; other banks are recorded as an
// outbound-only request for admin review.
exports.externalTransfer = async (req, res) => {
  let idempotencyKey;
  try {
    const userId = req.userId;
    const amount = parseAmount(req.body.amount);
    const fromAccount = parseAccountType(req.body.fromAccount, 'checking');
    const note = parseNote(req.body.note);
    idempotencyKey = parseIdempotencyKey(req);

    const hasEmail = Boolean(String(req.body.recipientEmail || '').trim());
    const recipientEmail = hasEmail ? parseEmail(req.body.recipientEmail) : null;
    const recipientAccountNumber = hasEmail ? null : parseAccountNumber(req.body.recipientAccountNumber);
    const recipientRoutingNumber = hasEmail ? null : parseDigits(req.body.recipientRoutingNumber, 'Recipient routing number', 9);
    const requestedRecipientName = hasEmail
      ? (String(req.body.recipientName || '').trim() ? parseRecipientName(req.body.recipientName) : recipientEmail)
      : parseRecipientName(req.body.recipientName);
    const requestedBankName = hasEmail
      ? (String(req.body.bankName || '').trim() ? parseBankName(req.body.bankName) : 'External bank')
      : parseBankName(req.body.bankName);

    const existing = await findIdempotentDebit(userId, idempotencyKey);
    if (existing) return respondWithExistingTransfer(res, existing);

    const transferReference = createTransferReference('EXT', userId);
    const result = await withDatabaseTransaction(async (session) => {
      const duplicate = await findIdempotentDebit(userId, idempotencyKey, session);
      if (duplicate) {
        return {
          idempotent: true,
          debit: duplicate,
          credit: await findCounterpart(duplicate, 'credit', session),
        };
      }

      const sender = await queryWithSession(User.findById(userId), session);
      if (!sender) throw new TransferRequestError(404, 'User not found.');

      const recipientQuery = recipientEmail
        ? User.findOne({ email: recipientEmail })
        : User.findOne({ accountNumber: recipientAccountNumber, routingNumber: recipientRoutingNumber });
      const recipient = await queryWithSession(recipientQuery, session);
      if (recipient && sender._id.equals(recipient._id)) {
        throw new TransferRequestError(400, 'You cannot transfer to yourself. Use an internal transfer instead.');
      }
      const isAuroraRecipient = Boolean(recipient);
      const recipientName = isAuroraRecipient
        ? `${recipient.firstName} ${recipient.lastName}`.trim() || recipient.email
        : requestedRecipientName;
      const bankName = isAuroraRecipient ? 'Aurora Bank' : requestedBankName;

      ensureAccounts(sender);
      const source = accountFor(sender, fromAccount);
      if (!source) throw new TransferRequestError(400, `Your ${fromAccount} account is unavailable.`);
      if (money(source.balance) < amount) {
        throw new TransferRequestError(400, `Insufficient funds in ${fromAccount}. Available: $${money(source.balance).toFixed(2)}`);
      }

      source.balance = money(source.balance - amount);
      recalculateBalance(sender);

      const senderName = `${sender.firstName} ${sender.lastName}`.trim() || sender.email;
      const now = new Date();
      const idempotency = idempotencyKey ? { idempotencyKey } : {};
      const debitData = {
          userId: sender._id,
          amount: -amount,
          description: `Transfer to ${recipientName}`,
          category: 'External Transfer',
          accountType: fromAccount,
          status: 'pending',
          transferType: 'external',
          reference: `${transferReference}-D`,
          transferReference,
          transferRole: 'debit',
          note,
          date: now,
          recipientMeta: {
            recipientName,
            bankName,
            routingNumber: isAuroraRecipient ? recipient.routingNumber : recipientRoutingNumber,
            accountNumber: isAuroraRecipient ? recipient.accountNumber : recipientAccountNumber,
            recipientEmail: isAuroraRecipient ? recipient.email : (hasEmail ? recipientEmail : undefined),
            recipientId: isAuroraRecipient ? recipient._id : undefined,
            recipientAccountNumber: isAuroraRecipient ? recipient.accountNumber : recipientAccountNumber,
            recipientRoutingNumber: isAuroraRecipient ? recipient.routingNumber : recipientRoutingNumber,
            externalBank: !isAuroraRecipient,
          },
          ...idempotency,
        };
      const creditData = isAuroraRecipient ? {
          userId: recipient._id,
          amount,
          description: `Transfer from ${senderName}`,
          category: 'External Transfer',
          accountType: 'checking',
          status: 'pending',
          transferType: 'external',
          reference: `${transferReference}-C`,
          transferReference,
          transferRole: 'credit',
          note,
          date: now,
          recipientMeta: {
            senderName,
            senderEmail: sender.email,
            senderId: sender._id,
            senderAccountNumber: sender.accountNumber,
            senderRoutingNumber: sender.routingNumber,
          },
          ...idempotency,
        } : null;
      const ledgerEntries = await Transaction.insertMany(
        creditData ? [debitData, creditData] : [debitData],
        sessionOptions(session),
      );
      const [debit, credit] = ledgerEntries;

      try {
        await sender.save(sessionOptions(session));
      } catch (error) {
        if (!session) {
          await Transaction.deleteMany({ _id: { $in: ledgerEntries.map((entry) => entry._id) } }).catch(() => {});
        }
        throw error;
      }

      return { debit, credit: credit || null, user: sender, isAuroraRecipient };
    });

    if (result.idempotent) {
      return res.status(200).json(externalResponse(result.debit, result.credit, null, true));
    }

    const response = externalResponse(result.debit, result.credit, result.user);
    if (!result.isAuroraRecipient) {
      response.message = 'External bank transfer submitted for admin approval. Funds are held until it is approved or rejected.';
    }
    return res.status(201).json(response);
  } catch (error) {
    if (duplicateKeyError(error) && idempotencyKey) {
      const existing = await findIdempotentDebit(req.userId, idempotencyKey).catch(() => null);
      if (existing) return respondWithExistingTransfer(res, existing);
    }
    console.error('External transfer error:', error);
    return res.status(error.status || 500).json({
      status: 'error',
      message: error.status ? error.message : 'Server error processing transfer.',
    });
  }
};

// Saved recipients are derived from completed or pending outgoing transfers.
exports.getBeneficiaries = async (req, res) => {
  try {
    const recentTransfers = await Transaction.find({
      userId: req.userId,
      transferType: 'external',
      transferRole: { $ne: 'credit' },
      'recipientMeta.recipientEmail': { $exists: true },
    })
      .sort({ date: -1 })
      .limit(50)
      .lean();

    const beneficiaries = [];
    const seen = new Set();
    for (const transaction of recentTransfers) {
      const recipient = transaction.recipientMeta || {};
      const key = recipient.recipientEmail || recipient.accountNumber;
      if (!key || seen.has(key)) continue;
      seen.add(key);
      beneficiaries.push({
        id: key,
        name: recipient.recipientName || 'Aurora Bank recipient',
        email: recipient.recipientEmail || '',
        accountNumber: recipient.recipientAccountNumber || recipient.accountNumber || '',
        routingNumber: recipient.recipientRoutingNumber || recipient.routingNumber || '',
        lastUsed: transaction.date,
      });
    }

    return res.json({ status: 'success', beneficiaries });
  } catch (error) {
    console.error('Get beneficiaries error:', error);
    return res.status(500).json({ status: 'error', message: 'Error fetching beneficiaries.' });
  }
};

// Beneficiaries are intentionally derived from successful submissions, so a
// separate POST would imply persistence that does not exist.
exports.addBeneficiary = async (_req, res) => res.status(501).json({
  status: 'error',
  message: 'Beneficiaries are added automatically after a transfer is submitted.',
});

exports.deleteBeneficiary = async (_req, res) => res.status(501).json({
  status: 'error',
  message: 'Saved beneficiaries cannot be deleted yet.',
});
