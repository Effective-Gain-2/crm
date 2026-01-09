const express = require('express');
const { createLembreteController, getLembretesController, updateLembretesController, deleteLembreteController } = require('../controllers/LembretesController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.get('/get-lembretes/:schema', allowedRoles(), getLembretesController)
router.post('/create-lembrete', allowedRoles(null, true, 'Lembrete criado'), createLembreteController)
router.put('/update-lembretes', allowedRoles(null, true, 'Lembrete atualizado'), updateLembretesController)
router.delete('/delete-lembrete', allowedRoles(null, true, 'Lembrete deletado'), deleteLembreteController)
module.exports = router;
