const express = require('express')
const {verifyToken} = require('../controllers/UserController')
const {getAllStockItensController, insertItemInStockController, getItemByIdController, alterItemQuantityInStockController, updateItemInStockController, getStockCategoriesController, createStockCategoryController, deleteStockCategoryController} = require('../controllers/StockController')
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router()


router.get('/get-categories/:schema', verifyToken, allowedRoles(), getStockCategoriesController)
router.get('/get-all-itens/:schema', verifyToken, allowedRoles(), getAllStockItensController)
router.get('/get-by-id/:item_id/:schema', verifyToken, allowedRoles(), getItemByIdController)
router.post('/insert-stock-item', verifyToken, allowedRoles(), insertItemInStockController)
router.post('/create-category', verifyToken, allowedRoles(), createStockCategoryController)
router.put('/alter-item-quantity', verifyToken, allowedRoles('tec-admin'), alterItemQuantityInStockController)
router.put('/update-item', verifyToken, allowedRoles('tec-admin'), updateItemInStockController)
router.delete('/delete-category/:category_id/:schema', verifyToken, allowedRoles('tec-admin'), deleteStockCategoryController)


module.exports = router

