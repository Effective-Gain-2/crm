const express = require('express');
const { verifyWebhook, receiveWebhook } = require('../controllers/MetaLeadsController');

const router = express.Router();

// GET  /meta-leads  -> verificação do webhook (hub.challenge)
router.get('/', verifyWebhook);
// POST /meta-leads  -> recebe leadgen e cria a oportunidade
router.post('/', receiveWebhook);

module.exports = router;
