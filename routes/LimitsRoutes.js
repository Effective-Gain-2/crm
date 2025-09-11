const express = require('express');
const { insertLimitsController, updateLimitsController, getLimitsBySchemaController } = require('../controllers/LimitsController');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.get('/get-limits/:schema', verifyToken, getLimitsBySchemaController)
router.post('/insert-limit', verifyToken, insertLimitsController)
router.put('/update-limit', verifyToken, updateLimitsController)

module.exports=router