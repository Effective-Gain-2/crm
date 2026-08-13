const express = require('express');
const {
    createOpportunityController,
    getOpportunitiesByFunnelController,
    getOpportunitiesByStageController,
    getOpportunityByIdController,
    moveOpportunityStageController,
    updateOpportunityController,
    deleteOpportunityController,
    getForecastController,
} = require('../controllers/OpportunityController');

const router = express.Router();

router.post('/create', createOpportunityController);
router.get('/by-funnel/:funnel/:schema', getOpportunitiesByFunnelController);
router.get('/by-stage/:stage_id/:schema', getOpportunitiesByStageController);
router.get('/forecast/:funnel/:schema', getForecastController);
router.get('/:id/:schema', getOpportunityByIdController);
router.put('/move-stage', moveOpportunityStageController);
router.put('/update', updateOpportunityController);
router.delete('/delete/:id/:schema', deleteOpportunityController);

module.exports = router;
