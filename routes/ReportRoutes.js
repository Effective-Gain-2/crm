const express = require('express');
const { getReportsController, generateSummaryController, getSummaryController } = require('../controllers/ReportController');
const router = express.Router();

router.get('/get-reports/:schema', getReportsController)
router.get('/resumo/:chat_id/:schema', getSummaryController)
router.post('/generate-resumo', generateSummaryController)


module.exports = router;