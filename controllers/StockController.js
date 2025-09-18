const { getAllStockItens, insertItemInStock, getItemById, alterItemQuantityInStock, updateItemInStock, getStockCategories, createStockCategory, deleteStockCategory } = require("../services/StockService")

const getAllStockItensController = async (req, res) => {
    const {schema} = req.params
    try {
        const result = await getAllStockItens(schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}

const insertItemInStockController = async (req, res) => {
    const {nome, quantidade, categoria, schema} = req.body
    try {
        const result = await insertItemInStock(nome, quantidade, categoria, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}
const getItemByIdController = async (req, res) => {
    const {item_id, schema} = req.params
    try {
        const result = await getItemById(item_id, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}
const alterItemQuantityInStockController = async (req, res) => {
    const {item_id, quantity, isSum, schema} = req.body
    try {
        const result = await alterItemQuantityInStock(item_id, quantity, isSum, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}

const updateItemInStockController = async (req, res) => {
    const {item_id, item_name, category, quantity, schema} = req.body
    try {
        const result = await updateItemInStock(item_id, item_name, category, quantity, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}
const getStockCategoriesController = async (req,res) => {
    const {schema} = req.params
    try {
        const result = await getStockCategories(schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}
const createStockCategoryController = async (req, res) => {
    const {category_name, schema} = req.body
    try {
        const result = await createStockCategory(category_name, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}
const deleteStockCategoryController = async (req,res) => {
    const {category_id, schema} = req.params
    try {
        const result = await deleteStockCategory(category_id, schema)
        res.status(200).json({
            success:true,
            data:result
        })
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success:false
        })
    }
}
module.exports={
    getAllStockItensController,
    insertItemInStockController,
    getItemByIdController,
    alterItemQuantityInStockController,
    updateItemInStockController,
    getStockCategoriesController,
    createStockCategoryController,
    deleteStockCategoryController
}
