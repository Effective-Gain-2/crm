const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { 
    createReceitaController, 
    getReceitasController, 
    getReceitaByIdController, 
    updateReceitaController, 
    deleteReceitaController, 
    getReceitasStatsController, 
    testConnectionController,
    getMonthlyGainController,
    getLastNMonthsGainController,
    getNextNMonthsProjectionController
} = require('../controllers/ReceitaController');
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router();

router.get('/get-receitas/:schema', verifyToken, allowedRoles(), getReceitasController);
router.get('/get-receita/:receita_id/:schema', verifyToken, allowedRoles(), getReceitaByIdController);
router.get('/get-receitas-stats/:schema', verifyToken, allowedRoles(), getReceitasStatsController);
router.get('/test-connection', verifyToken, allowedRoles(), testConnectionController);
router.post('/create-receita', verifyToken, allowedRoles(null, true, 'Receita criada'), createReceitaController);
router.put('/update-receita/:receita_id/:schema', allowedRoles('tec-admin', true, 'Receita atualizada'), verifyToken, updateReceitaController);
router.delete('/delete-receita', verifyToken, allowedRoles('tec-admin', true, 'Receita deletada'), deleteReceitaController);

// Rotas para cálculo de ganhos mensais
router.get('/monthly-gain/:year/:month/:schema', verifyToken, allowedRoles(), getMonthlyGainController);
router.get('/last-months-gain/:months/:schema', verifyToken, allowedRoles(), getLastNMonthsGainController);
router.get('/next-months-projection/:months/:schema', verifyToken, allowedRoles(), getNextNMonthsProjectionController);

module.exports = router;
