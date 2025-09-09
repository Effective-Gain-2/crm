const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { getVendorsController, createVendorController } = require('../controllers/VendorsController');
const router = express.Router();

router.get('/get-vendors/:schema', verifyToken, getVendorsController);
router.post('/create-vendor', verifyToken, createVendorController);

module.exports = router;
