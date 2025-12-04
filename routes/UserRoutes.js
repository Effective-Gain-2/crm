const express = require('express');
const router = express.Router();
const { createUserController, getAllUsersController, searchUserController, getOnlineUsersController, deleteUserController, updateUserController, searchUserByIdController, logoutController, verifyToken, refreshTokenController } = require('../controllers/UserController');
const { verifyUserRoleAndId, allowedRoles } = require('../middlewares/RequireUser');

router.get('/users/:schema', verifyToken, allowedRoles(), getAllUsersController);
router.get('/users/online', verifyToken, allowedRoles(), getOnlineUsersController)
router.get('/search-user/:schema/:user_id', verifyToken, allowedRoles(), searchUserByIdController);
router.post('/users', verifyToken, allowedRoles('tec-admin'), createUserController);
router.post('/login', searchUserController);
router.post('/logout', logoutController);
router.post('/refresh-token', refreshTokenController)
router.put('/update-user', verifyToken, allowedRoles('tec-admin'), updateUserController)
router.delete('/delete-user', verifyToken, allowedRoles('tec-admin'), deleteUserController)

module.exports = router;