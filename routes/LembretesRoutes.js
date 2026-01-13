const express = require('express');
const { createLembreteController, getLembretesController, updateLembretesController, deleteLembreteController } = require('../controllers/LembretesController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.get('/get-lembretes/:schema', verifyToken , allowedRoles(), getLembretesController)
router.post('/create-lembrete',verifyToken, allowedRoles(null, true, 'Lembrete criado'), createLembreteController)
router.put('/update-lembretes', verifyToken, allowedRoles(null, true, 'Lembrete atualizado'), updateLembretesController)
router.delete('/delete-lembrete', verifyToken, allowedRoles(null, true, 'Lembrete deletado'), deleteLembreteController)
module.exports = router;
