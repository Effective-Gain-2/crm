const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { getVendorsController, createVendorController } = require('../controllers/VendorsController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.get('/get-vendors/:schema', verifyToken, allowedRoles(), getVendorsController);
router.post('/create-vendor', verifyToken, allowedRoles('tec-admin'), createVendorController);

module.exports = router;
