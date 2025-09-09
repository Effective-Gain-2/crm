const express = require('express');
const { createLembreteController, getLembretesController, updateLembretesController, deleteLembreteController } = require('../controllers/LembretesController');
const router = express.Router();

router.get('/get-lembretes/:schema', getLembretesController)
router.post('/create-lembrete', createLembreteController)
router.put('/update-lembretes', updateLembretesController)
router.delete('/delete-lembrete', deleteLembreteController)
module.exports = router;
