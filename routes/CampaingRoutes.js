const express = require('express');
const { startCampaingController, getCampaingsController, getCampaingByIdController, createCampaingController, getAllBlastMessagesController, deleteCampaingController, getCampaingsDataController, getCampaingChatsController } = require('../controllers/CampaingContoller');
const { createMessageForBlastController } = require('../controllers/MessageBlastController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.post('/start', verifyToken, allowedRoles('tec-admin', true, 'Campanha iniciada'),startCampaingController)
router.get('/get-campaing/:schema', verifyToken, allowedRoles(), getCampaingsController)
router.get('/get-campaings-data/:schema', verifyToken, allowedRoles(), getCampaingsDataController)
router.get('/get-campaing-chats/:campaing_id/:schema', verifyToken, allowedRoles(), getCampaingChatsController)
router.get('/get-campaing/:campaing_id/:schema', verifyToken, allowedRoles(), getCampaingByIdController)
router.post('/create', verifyToken, allowedRoles('tec-admin', true, 'Campanha criada'), createCampaingController)
router.post('/create-message', verifyToken, allowedRoles('tec-admin'), createMessageForBlastController)
router.get('/get-messages/:campaing_id/:schema', verifyToken, allowedRoles('tec-admin'), getAllBlastMessagesController)
router.delete('/delete/:campaing_id/:schema', verifyToken, allowedRoles('tec-admin', true, 'Campanha deletada'), deleteCampaingController)
module.exports = router;
