const express = require('express');
const { verifyWebhook, receiveWebhook } = require('../controllers/MetaLeadsController');

const router = express.Router();

// GET  /meta-leads[/:schema]  -> verificação do webhook (hub.challenge)
router.get('/', verifyWebhook);
router.get('/:schema', verifyWebhook);
// POST /meta-leads[/:schema] -> recebe leadgen e cria a oportunidade na empresa
router.post('/', receiveWebhook);
router.post('/:schema', receiveWebhook);

module.exports = router;
