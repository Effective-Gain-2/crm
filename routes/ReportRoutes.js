const express = require('express');
const { getReportsController } = require('../controllers/ReportController');
const router = express.Router();

router.get('/get-reports/:schema', getReportsController)


module.exports = router;