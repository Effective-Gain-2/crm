const express = require('express');
const router = express.Router();
const { createUserController, getAllUsersController, searchUserController, getOnlineUsersController, deleteUserController, updateUserController, searchUserByIdController, logoutController, verifyToken, refreshTokenController } = require('../controllers/UserController');

router.get('/users/:schema', verifyToken ,getAllUsersController);
router.get('/users/online', verifyToken, getOnlineUsersController)
router.get('/search-user/:schema/:user_id', verifyToken, searchUserByIdController);
router.post('/users', verifyToken, createUserController);
router.post('/login', searchUserController);
router.post('/logout', logoutController);
router.post('/refresh-token', refreshTokenController)
router.put('/update-user', verifyToken, updateUserController)
router.delete('/delete-user', verifyToken, deleteUserController)

module.exports = router;