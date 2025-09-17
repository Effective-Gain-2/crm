const express = require('express')
const router = express.Router()

const {verifyToken} = require('../controllers/UserController')
const {getAllStockItensController, insertItemInStockController, getItemByIdController, alterItemQuantityInStockController, updateItemInStockController} = require('../controllers/StockController')

router.get('/get-all-itens/:schema', verifyToken, getAllStockItensController)
router.get('/get-by-id/:item_id/:schema', verifyToken, getItemByIdController)
router.post('/insert-stock-item', verifyToken, insertItemInStockController)
router.put('/alter-item-quantity', verifyToken, alterItemQuantityInStockController)
router.put('/update-item', verifyToken, updateItemInStockController)

module.exports = router

