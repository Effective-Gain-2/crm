const express = require('express');
const { createLembreteController, getLembretesController, updateLembretesController, deleteLembreteController } = require('../controllers/LembretesController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.get('/get-lembretes/:schema', allowedRoles(), getLembretesController)
router.post('/create-lembrete', allowedRoles(), createLembreteController)
router.put('/update-lembretes', allowedRoles(), updateLembretesController)
router.delete('/delete-lembrete', allowedRoles(), deleteLembreteController)
module.exports = router;
