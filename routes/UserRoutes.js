const express = require('express');
const router = express.Router();
const {
    createUserController,
    getAllUsersController,
    getOnlineUsersController,
    deleteUserController,
    updateUserController,
    changeMyPasswordController,
    searchUserByIdController,
} = require('../controllers/UserController');
const {
    loginController,
    selectCompanyController,
    refreshTokenController,
    meController,
    logoutController,
} = require('../controllers/AuthController');
const { requireRole } = require('../middlewares/requireRole');

// ---- Autenticação global (públicas — liberadas no gate do index.js) ----
router.post('/login', loginController);
router.post('/select-company', selectCompanyController);
router.post('/refresh-token', refreshTokenController);
router.post('/logout', logoutController);

// ---- Sessão ----
router.get('/me', meController);
// Troca da própria senha (qualquer papel autenticado; exige a senha atual)
router.post('/change-password', changeMyPasswordController);

// ---- Usuários do tenant ----
// Rotas específicas ANTES do :schema (bug antigo: /users/online era capturado por /users/:schema)
router.get('/users/online', getOnlineUsersController);
router.get('/users/:schema', getAllUsersController);
router.get('/search-user/:schema/:user_id', searchUserByIdController);
router.post('/users', requireRole('master'), createUserController);
router.put('/update-user', requireRole('master'), updateUserController);
router.delete('/delete-user', requireRole('master'), deleteUserController);

module.exports = router;
