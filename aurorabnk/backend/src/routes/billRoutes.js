// src/routes/billRoutes.js
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

// User routes (protected)
router.post('/', protect, (req, res, next) => {
	console.log('[BILL] POST /', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, body: req.body });
	billController.payBill(req, res, next);
});
router.get('/', protect, (req, res, next) => {
	console.log('[BILL] GET /', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id });
	billController.getBillPayments(req, res, next);
});
router.get('/:id', protect, (req, res, next) => {
	console.log('[BILL] GET /:id', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, params: req.params });
	billController.getBillPaymentById(req, res, next);
});

module.exports = router;
