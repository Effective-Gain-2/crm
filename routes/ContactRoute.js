const express = require('express');
const { createCustomFieldController, insertValueCustomFieldController, createContactController, updateContactNameController } = require('../controllers/ContactController');
const router = express.Router();

router.post('/create-field', createCustomFieldController)
router.post('/insert-value', insertValueCustomFieldController)
router.post('/create-contact', createContactController)
router.put('/update-name', updateContactNameController)

module.exports = router;