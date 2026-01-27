// src/routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { protect, requireRole } = require('../middleware/authMiddleware');

// User routes (protected)
router.post('/', protect, (req, res, next) => {
	console.log('[TRANSACTION] POST /', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, body: req.body });
	transactionController.createTransaction(req, res, next);
});
router.get('/', protect, (req, res, next) => {
	console.log('[TRANSACTION] GET /', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id });
	transactionController.getTransactions(req, res, next);
});
router.get('/:id', protect, (req, res, next) => {
	console.log('[TRANSACTION] GET /:id', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, params: req.params });
	transactionController.getTransactionById(req, res, next);
});
router.post('/notify-receiver', protect, (req, res, next) => {
	console.log('[TRANSACTION] POST /notify-receiver', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, body: req.body });
	transactionController.notifyReceiver(req, res, next);
});

// Admin routes
router.get('/admin/pending', protect, requireRole('admin'), (req, res, next) => {
	console.log('[TRANSACTION] GET /admin/pending', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id });
	transactionController.getPendingTransactions(req, res, next);
});
router.patch('/:id/approve', protect, requireRole('admin'), (req, res, next) => {
	console.log('[TRANSACTION] PATCH /:id/approve', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, params: req.params });
	transactionController.approveTransaction(req, res, next);
});
router.patch('/:id/reject', protect, requireRole('admin'), (req, res, next) => {
	console.log('[TRANSACTION] PATCH /:id/reject', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, params: req.params });
	transactionController.rejectTransaction(req, res, next);
});

module.exports = router;
