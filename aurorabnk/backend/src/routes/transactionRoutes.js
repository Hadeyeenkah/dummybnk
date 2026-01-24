// src/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// User routes (protected)
router.post('/', protect, transactionController.createTransaction);
router.get('/', protect, transactionController.getTransactions);
router.get('/:id', protect, transactionController.getTransactionById);
router.post('/notify-receiver', protect, transactionController.notifyReceiver);

// Admin routes
router.get('/admin/pending', protect, requireRole('admin'), transactionController.getPendingTransactions);
router.patch('/:id/approve', protect, requireRole('admin'), transactionController.approveTransaction);
router.patch('/:id/reject', protect, requireRole('admin'), transactionController.rejectTransaction);

module.exports = router;
