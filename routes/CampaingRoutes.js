const express = require('express');
const { startCampaingController, getCampaingsController, getCampaingByIdController, createCampaingController, getAllBlastMessagesController, deleteCampaingController, getCampaingDetailsController, getCampaingMetricsController, cancelCampaingController } = require('../controllers/CampaingContoller');
const { createMessageForBlastController } = require('../controllers/MessageBlastController');
const router = express.Router();

router.post('/start', startCampaingController)
router.get('/get-campaing/:schema', getCampaingsController)
router.get('/get-campaing/:campaing_id/:schema', getCampaingByIdController)
router.post('/create', createCampaingController)
router.post('/create-message', createMessageForBlastController)
router.get('/get-messages/:campaing_id/:schema', getAllBlastMessagesController)
router.delete('/delete/:campaing_id/:schema', deleteCampaingController)
router.get('/details/:campaing_id/:schema', getCampaingDetailsController)
router.get('/metrics/:campaing_id/:schema', getCampaingMetricsController)
router.post('/cancel/:campaing_id/:schema', cancelCampaingController)
module.exports = router;
