const express = require('express');
const { reportController, summaryController } = require('../controllers/AttributionController');

const router = express.Router();

router.get('/report/:schema', reportController);
router.get('/summary/:schema', summaryController);

module.exports = router;
