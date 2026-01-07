const express = require('express');
const router = express.Router();
const ConnectionApiController = require('../controllers/ConnectionApiController');

router.post('/send', ConnectionApiController.sendWhatsappMessage);

module.exports = router;