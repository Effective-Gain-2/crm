const express = require('express');
const { getReportsController, generateSummaryController, getSummaryController } = require('../controllers/ReportController');
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router();

router.get('/get-reports/:schema', allowedRoles(), getReportsController)
router.get('/resumo/:chat_id/:schema', allowedRoles(), getSummaryController)
router.post('/generate-resumo',allowedRoles(), generateSummaryController)


module.exports = router;