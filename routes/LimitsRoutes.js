const express = require('express');
const { insertLimitsController, updateLimitsController, getLimitsBySchemaController } = require('../controllers/LimitsController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.get('/get-limits/:schema', verifyToken, allowedRoles('tec'), getLimitsBySchemaController)
router.post('/insert-limit', verifyToken, allowedRoles('tec'), insertLimitsController)
router.put('/update-limit', verifyToken, allowedRoles('tec'), updateLimitsController)

module.exports=router