const express = require('express');
const { createCustomFieldController, insertValueCustomFieldController, createContactController, updateContactNameController, getCustomFieldsByContactController } = require('../controllers/ContactController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.get('/get-custom-values/:contact_number/:schema', verifyToken, allowedRoles(), getCustomFieldsByContactController)
router.post('/create-field', verifyToken, allowedRoles(null, true, 'Campo customizado criado'), createCustomFieldController)
router.post('/insert-value', verifyToken, allowedRoles(null, true, 'Valor de campo customizado inserido'), insertValueCustomFieldController)
router.post('/create-contact', verifyToken, allowedRoles(null, true, 'Contato criado'), createContactController)
router.put('/update-name', verifyToken, allowedRoles(null, true, 'Nome do contato atualizado'), updateContactNameController)

module.exports = router;