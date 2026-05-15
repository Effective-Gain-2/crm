const express = require('express');
const router = express.Router();
const { listLeadSummariesController, markLeadSummaryReadController } = require('../controllers/LeadSummaryController');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

router.get('/', verifyToken, allowedRoles(), listLeadSummariesController);
router.put('/:id/read', verifyToken, allowedRoles(), markLeadSummaryReadController);

module.exports = router;
