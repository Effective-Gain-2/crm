const express = require('express');
const router = express.Router();
const { createInstanceController, fetchInstanceController, sendTextMessageController } = require('../controllers/EvolutionController');

router.post('/instance', createInstanceController)
router.get('/fetchInstances', fetchInstanceController)
router.post('/sendText', sendTextMessageController)

router.post('/webhook', (req, res) => {
    const data = req.body;
    
    if (data.type === 'message') {
        const { from, body, timestamp, instance } = data;
        
        console.log(`[${instance}] Mensagem de ${from}: ${body}`);
        
        
    }
    
    res.sendStatus(200);
});

module.exports = router