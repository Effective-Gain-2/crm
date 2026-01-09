const express = require('express');
const router = express.Router();
const { createUserController, getAllUsersController, searchUserController, getOnlineUsersController, deleteUserController, updateUserController, searchUserByIdController, logoutController, verifyToken, refreshTokenController, googleCallbackController, gerarLembretesController } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

router.get('/users/:schema', verifyToken, allowedRoles(), getAllUsersController);
router.get('/users/online', verifyToken, allowedRoles(), getOnlineUsersController)
router.get('/search-user/:schema/:user_id', verifyToken, allowedRoles(), searchUserByIdController);
router.post('/users', verifyToken, allowedRoles('tec-admin', true, 'Usuário criado'), createUserController);
router.post('/login', searchUserController);
router.post('/logout', verifyToken, logoutController);
router.post('/refresh-token', refreshTokenController)
router.put('/update-user', verifyToken, allowedRoles('tec-admin', true, 'Usuário atualizado'), updateUserController)
router.delete('/delete-user', verifyToken, allowedRoles('tec-admin', true, 'Usuário deletado'), deleteUserController)


router.get('/auth/google/callback', googleCallbackController);
router.post('/gerar-lembretes', gerarLembretesController);


module.exports = router;