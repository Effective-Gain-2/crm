const express = require('express');
const { startCampaingController, getCampaingsController, getCampaingByIdController, createCampaingController, getAllBlastMessagesController } = require('../controllers/CampaingContoller');
const { createMessageForBlastController } = require('../controllers/MessageBlastController');
const router = express.Router();

router.post('/start', startCampaingController)
router.get('/get-campaing/:schema', getCampaingsController)
router.get('/get-campaing/:campaing_id/:schema', getCampaingByIdController)
router.post('/create', createCampaingController)
router.post('/create-message', createMessageForBlastController)
router.get('/get-messages/:campaing_id/:schema', getAllBlastMessagesController)
module.exports = router;
