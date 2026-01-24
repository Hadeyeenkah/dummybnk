// src/routes/billRoutes.js
const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { protect } = require('../middleware/authMiddleware');

// User routes (protected)
router.post('/', protect, billController.payBill);
router.get('/', protect, billController.getBillPayments);
router.get('/:id', protect, billController.getBillPaymentById);

module.exports = router;
