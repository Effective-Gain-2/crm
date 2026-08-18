const express = require('express');
const { verifyWebhook, receiveWebhook } = require('../controllers/HubSpotLeadsController');

const router = express.Router();

// GET  /hubspot-leads/:schema  -> verificação (hub.challenge)
router.get('/', verifyWebhook);
router.get('/:schema', verifyWebhook);
// POST /hubspot-leads/:schema -> recebe lead(s) e cria a oportunidade + 1º contato
router.post('/', receiveWebhook);
router.post('/:schema', receiveWebhook);

module.exports = router;
