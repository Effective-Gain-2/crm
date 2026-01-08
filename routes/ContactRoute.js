const express = require('express');
const { createCustomFieldController, insertValueCustomFieldController, createContactController, updateContactNameController, getCustomFieldsByContactController } = require('../controllers/ContactController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.get('/get-custom-values/:contact_number/:schema', verifyToken, allowedRoles(), getCustomFieldsByContactController)
router.post('/create-field', verifyToken, allowedRoles(), createCustomFieldController)
router.post('/insert-value', verifyToken, allowedRoles(), insertValueCustomFieldController)
router.post('/create-contact', verifyToken, allowedRoles(), createContactController)
router.put('/update-name', verifyToken, allowedRoles(), updateContactNameController)

module.exports = router;