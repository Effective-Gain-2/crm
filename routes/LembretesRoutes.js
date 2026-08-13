const express = require('express');
const { createLembreteController, getLembretesController, updateLembretesController, deleteLembreteController, setLembreteStatusController, snoozeLembreteController, getLembretesByContactController, getLembretesByOpportunityController } = require('../controllers/LembretesController');
const router = express.Router();

router.get('/get-lembretes/:schema', getLembretesController)
router.post('/create-lembrete', createLembreteController)
router.put('/update-lembretes', updateLembretesController)
router.delete('/delete-lembrete', deleteLembreteController)
router.patch('/:id/status', setLembreteStatusController)
router.patch('/:id/snooze', snoozeLembreteController)
router.get('/by-contact/:number/:schema', getLembretesByContactController)
router.get('/by-opportunity/:id/:schema', getLembretesByOpportunityController)
module.exports = router;
