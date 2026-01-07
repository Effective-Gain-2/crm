const express = require('express');
const { getPreferencesByUserController, setPreferenceController, updatePreferenceController } = require('../controllers/UserPreferenceController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { verifyToken } = require('../controllers/UserController');
const router = express.Router();

router.get('/get-user-preference/:user_id/:schema', verifyToken, allowedRoles(), getPreferencesByUserController)
router.post('/set-preference', verifyToken, allowedRoles(), setPreferenceController),
router.put('/update-preference', verifyToken, allowedRoles(), updatePreferenceController)

module.exports = router