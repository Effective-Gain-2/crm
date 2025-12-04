const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { getExpensesController, createExpenseController, createTaxRateController, getTaxRatesController, getExpensesByIdController, deleteExpenseController, getExpenseItemByIdController } = require('../controllers/ExpensesController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.get('/get-expenses/:schema', verifyToken, allowedRoles(),getExpensesController);
router.get('/get-expense/:expense_id/:schema', verifyToken, allowedRoles(), getExpensesByIdController);
router.get('/get-tax-rates/:schema', verifyToken, allowedRoles(), getTaxRatesController);
router.get('/get-expense-item/:expense_item_id/:schema', verifyToken, allowedRoles(), getExpenseItemByIdController);
router.post('/create-expense', verifyToken, allowedRoles('tec-admin'), createExpenseController);
router.post('/create-tax-rate', verifyToken, allowedRoles('tec-admin'), createTaxRateController);
router.delete('/delete-expense', verifyToken, allowedRoles('tec-admin'), deleteExpenseController)

module.exports = router;