// src/controllers/accountController.js
const { pool } = require('../config/database');

// Get all accounts for logged in user
exports.getAllAccounts = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT id, account_number, account_type, balance, available_balance, 
              currency, status, created_at, updated_at 
       FROM accounts WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );

    res.json({
      accounts: result.rows,
      totalAccounts: result.rows.length
    });

  } catch (error) {
    console.error('Get accounts error:', error);
    res.status(500).json({ message: 'Server error fetching accounts' });
  }
};

// Get single account details
exports.getAccountById = async (req, res) => {
  try {
    const userId = req.userId;
    const { accountId } = req.params;

    const result = await pool.query(
      `SELECT id, account_number, account_type, balance, available_balance, 
              currency, status, created_at, updated_at 
       FROM accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json({ account: result.rows[0] });

  } catch (error) {
    console.error('Get account error:', error);
    res.status(500).json({ message: 'Server error fetching account' });
  }
};

// Get account balance
exports.getAccountBalance = async (req, res) => {
  try {
    const userId = req.userId;
    const { accountId } = req.params;

    const result = await pool.query(
      `SELECT balance, available_balance, currency 
       FROM accounts WHERE id = $1 AND user_id = $2`,
      [accountId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get balance error:', error);
    res.status(500).json({ message: 'Server error fetching balance' });
  }
};

// Get account summary (total balances across all accounts)
exports.getAccountSummary = async (req, res) => {
  try {
    const userId = req.userId;

    const result = await pool.query(
      `SELECT 
        SUM(CASE WHEN account_type = 'checking' THEN balance ELSE 0 END) as checking_total,
        SUM(CASE WHEN account_type = 'savings' THEN balance ELSE 0 END) as savings_total,
        SUM(CASE WHEN account_type = 'credit' THEN balance ELSE 0 END) as credit_total,
        SUM(balance) as total_balance,
        COUNT(*) as total_accounts
       FROM accounts WHERE user_id = $1 AND status = 'active'`,
      [userId]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ message: 'Server error fetching summary' });
  }
};

// Create new account
exports.createAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { accountType } = req.body;

    // Validate account type
    const validTypes = ['checking', 'savings', 'credit'];
    if (!validTypes.includes(accountType)) {
      return res.status(400).json({ message: 'Invalid account type' });
    }

    // Generate account number
    const prefix = accountType === 'checking' ? 'CHK' : 
                   accountType === 'savings' ? 'SAV' : 'CRD';
    const accountNumber = prefix + Date.now() + Math.floor(Math.random() * 1000);

    // Create account
    const result = await pool.query(
      `INSERT INTO accounts (user_id, account_number, account_type, balance, available_balance) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, account_number, account_type, balance, available_balance, created_at`,
      [userId, accountNumber, accountType, 0.00, 0.00]
    );

    res.status(201).json({
      message: 'Account created successfully',
      account: result.rows[0]
    });

  } catch (error) {
    console.error('Create account error:', error);
    res.status(500).json({ message: 'Server error creating account' });
  }
};

// Close/deactivate account
exports.closeAccount = async (req, res) => {
  try {
    const userId = req.userId;
    const { accountId } = req.params;

    // Check if account exists and belongs to user
    const accountCheck = await pool.query(
      'SELECT balance FROM accounts WHERE id = $1 AND user_id = $2',
      [accountId, userId]
    );

    if (accountCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Account not found' });
    }

    // Check if account has balance
    if (parseFloat(accountCheck.rows[0].balance) !== 0) {
      return res.status(400).json({ 
        message: 'Cannot close account with non-zero balance' 
      });
    }

    // Update account status
    await pool.query(
      `UPDATE accounts SET status = 'closed', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1`,
      [accountId]
    );

    res.json({ message: 'Account closed successfully' });

  } catch (error) {
    console.error('Close account error:', error);
    res.status(500).json({ message: 'Server error closing account' });
  }
};