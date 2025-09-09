const express = require('express');
const { createCustomFieldController, insertValueCustomFieldController, createContactController, updateContactNameController, getCustomFieldsByContactController } = require('../controllers/ContactController');
const router = express.Router();

router.get('/get-custom-values/:contact_number/:schema', getCustomFieldsByContactController)
router.post('/create-field', createCustomFieldController)
router.post('/insert-value', insertValueCustomFieldController)
router.post('/create-contact', createContactController)
router.put('/update-name', updateContactNameController)

module.exports = router;