const express = require('express');
const { createCustomFieldController, insertValueCustomFieldController, createContactController, updateContactNameController, getCustomFieldsByContactController } = require('../controllers/ContactController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.get('/get-custom-values/:contact_number/:schema', allowedRoles(), getCustomFieldsByContactController)
router.post('/create-field', allowedRoles(), createCustomFieldController)
router.post('/insert-value', allowedRoles(), insertValueCustomFieldController)
router.post('/create-contact', allowedRoles(), createContactController)
router.put('/update-name', allowedRoles(), updateContactNameController)

module.exports = router;