const express = require('express')
const {verifyToken} = require('../controllers/UserController')
const {getAllStockItensController, insertItemInStockController, getItemByIdController, alterItemQuantityInStockController, updateItemInStockController, getStockCategoriesController, createStockCategoryController, deleteStockCategoryController} = require('../controllers/StockController')
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router()


router.get('/get-categories/:schema', verifyToken, allowedRoles(), getStockCategoriesController)
router.get('/get-all-itens/:schema', verifyToken, allowedRoles(), getAllStockItensController)
router.get('/get-by-id/:item_id/:schema', verifyToken, allowedRoles(), getItemByIdController)
router.post('/insert-stock-item', verifyToken, allowedRoles(null, true, 'Item inserido no estoque'), insertItemInStockController)
router.post('/create-category', verifyToken, allowedRoles(null, true, 'Categoria criada'), createStockCategoryController)
router.put('/alter-item-quantity', verifyToken, allowedRoles('tec-admin', true, 'Quantidade de item alterada'), alterItemQuantityInStockController)
router.put('/update-item', verifyToken, allowedRoles('tec-admin', true, 'Item atualizado'), updateItemInStockController)
router.delete('/delete-category/:category_id/:schema', verifyToken, allowedRoles('tec-admin', true, 'Categoria deletada'), deleteStockCategoryController)


module.exports = router

