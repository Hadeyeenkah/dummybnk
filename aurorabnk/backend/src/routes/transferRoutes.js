// src/routes/transferRoutes.js
const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Transfer routes
router.post('/internal', transferController.internalTransfer);
router.post('/external', transferController.externalTransfer);

// Beneficiary routes
router.get('/beneficiaries', transferController.getBeneficiaries);
router.post('/beneficiaries', transferController.addBeneficiary);
router.delete('/beneficiaries/:beneficiaryId', transferController.deleteBeneficiary);

module.exports = router;