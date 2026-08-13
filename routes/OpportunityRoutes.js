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
    listScoreRulesController,
    createScoreRuleController,
    deleteScoreRuleController,
    recomputeScoresController,
    importLeadsController,
} = require('../controllers/OpportunityController');

const router = express.Router();

router.post('/create', createOpportunityController);
router.get('/by-funnel/:funnel/:schema', getOpportunitiesByFunnelController);
router.get('/by-stage/:stage_id/:schema', getOpportunitiesByStageController);
router.get('/forecast/:funnel/:schema', getForecastController);

// Lead scoring — ANTES do catch-all /:id/:schema
router.get('/score-rules/:schema', listScoreRulesController);
router.post('/score-rules', createScoreRuleController);
router.delete('/score-rules/:id/:schema', deleteScoreRuleController);
router.post('/recompute-scores', recomputeScoresController);
router.post('/import', require('../middlewares/requireRole').requireRole('master'), importLeadsController);

router.get('/:id/:schema', getOpportunityByIdController);
router.put('/move-stage', moveOpportunityStageController);
router.put('/update', updateOpportunityController);
router.delete('/delete/:id/:schema', deleteOpportunityController);

module.exports = router;
