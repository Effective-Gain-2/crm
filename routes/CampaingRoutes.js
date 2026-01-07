const express = require('express');
const { startCampaingController, getCampaingsController, getCampaingByIdController, createCampaingController, getAllBlastMessagesController, deleteCampaingController, getCampaingsDataController, getCampaingChatsController } = require('../controllers/CampaingContoller');
const { createMessageForBlastController } = require('../controllers/MessageBlastController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.post('/start', allowedRoles('tec-admin'),startCampaingController)
router.get('/get-campaing/:schema', allowedRoles(), getCampaingsController)
router.get('/get-campaings-data/:schema', allowedRoles(), getCampaingsDataController)
router.get('/get-campaing-chats/:campaing_id/:schema', allowedRoles(), getCampaingChatsController)
router.get('/get-campaing/:campaing_id/:schema', allowedRoles(), getCampaingByIdController)
router.post('/create', allowedRoles('tec-admin'), createCampaingController)
router.post('/create-message', allowedRoles('tec-admin'), createMessageForBlastController)
router.get('/get-messages/:campaing_id/:schema', allowedRoles('tec-admin'), getAllBlastMessagesController)
router.delete('/delete/:campaing_id/:schema', allowedRoles('tec-admin'), deleteCampaingController)
module.exports = router;
