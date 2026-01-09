const express = require('express');
const { getReportsController, generateSummaryController, getSummaryController } = require('../controllers/ReportController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { verifyToken } = require('../controllers/UserController');

const router = express.Router();

router.get('/get-reports/:schema', verifyToken,allowedRoles(), getReportsController)
router.get('/resumo/:chat_id/:schema', verifyToken,allowedRoles(), getSummaryController)
router.post('/generate-resumo',verifyToken,allowedRoles(), generateSummaryController)


module.exports = router;