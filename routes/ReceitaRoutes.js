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

const router = express.Router();

router.get('/get-receitas/:schema', verifyToken, getReceitasController);
router.get('/get-receita/:receita_id/:schema', verifyToken, getReceitaByIdController);
router.get('/get-receitas-stats/:schema', verifyToken, getReceitasStatsController);
router.get('/test-connection', verifyToken, testConnectionController);
router.post('/create-receita', verifyToken, createReceitaController);
router.put('/update-receita/:receita_id/:schema', verifyToken, updateReceitaController);
router.delete('/delete-receita', verifyToken, deleteReceitaController);

// Rotas para cálculo de ganhos mensais
router.get('/monthly-gain/:year/:month/:schema', verifyToken, getMonthlyGainController);
router.get('/last-months-gain/:months/:schema', verifyToken, getLastNMonthsGainController);
router.get('/next-months-projection/:months/:schema', verifyToken, getNextNMonthsProjectionController);

module.exports = router;
