// src/routes/transferRoutes.js
const express = require('express');
const router = express.Router();
const transferController = require('../controllers/transferController');
const { protect } = require('../middleware/authMiddleware');

// All routes require authentication
router.use(protect);

// Transfer routes
router.post('/internal', (req, res, next) => {
	console.log('[TRANSFER] POST /internal', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, body: req.body });
	transferController.internalTransfer(req, res, next);
});
router.post('/external', (req, res, next) => {
	console.log('[TRANSFER] POST /external', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, body: req.body });
	transferController.externalTransfer(req, res, next);
});

// Beneficiary routes
router.get('/beneficiaries', (req, res, next) => {
	console.log('[TRANSFER] GET /beneficiaries', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id });
	transferController.getBeneficiaries(req, res, next);
});
router.post('/beneficiaries', (req, res, next) => {
	console.log('[TRANSFER] POST /beneficiaries', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, body: req.body });
	transferController.addBeneficiary(req, res, next);
});
router.delete('/beneficiaries/:beneficiaryId', (req, res, next) => {
	console.log('[TRANSFER] DELETE /beneficiaries/:beneficiaryId', { ip: req.ip, time: new Date().toISOString(), user: req.user?._id, params: req.params });
	transferController.deleteBeneficiary(req, res, next);
});

module.exports = router;