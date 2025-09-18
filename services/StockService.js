const { retail } = require("googleapis/build/src/apis/retail");
const pool = require("../db/queries")
const { v4: uuidv4 } = require('uuid');


const getAllStockItens = async (schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.stock`)
    return result.rows 
}

const insertItemInStock = async (item, quantity, category, schema) => {
    const result = await pool.query(`INSERT INTO ${schema}.stock (id, item, quantity, category) VALUES ($1, $2, $3, $4) RETURNING *`, [uuidv4(), item, quantity, category])
    return result.rows[0]
}

const getItemById = async (item_id, schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.stock WHERE id=$1`,[item_id])
    return result.rows[0]
}

const alterItemQuantityInStock = async (item_id, quantity, isSum, schema) => {
    const currentQuantity = await getItemById(item_id, schema)
    if(isSum){
        const result = await pool.query(`UPDATE ${schema}.stock set quantity=$1 WHERE id=$2 RETURNING *`, [(currentQuantity.quantity + quantity), item_id])
        return result.rows[0]
    }else{
        const result = await pool.query(`UPDATE ${schema}.stock set quantity=$1 WHERE id=$2 RETURNING *`, [(currentQuantity.quantity - quantity), item_id])
        return result.rows[0]
    }

}

const updateItemInStock = async (item_id, item_name, category, quantity, schema) => {
    const result = await pool.query(`UPDATE ${schema}.stock set item=$1, category=$2, quantity=$3 where id=$4 RETURNING *`,[item_name, category, quantity, item_id])
    return result.rows[0]
}

const getStockCategories = async (schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.stock_categories`)
    return result.rows
}

const createStockCategory = async (category_name, schema) => {
    const result = await pool.query(`INSERT INTO ${schema}.stock_categories(id, name) VALUES ($1, $2) RETURNING *`, [uuidv4(), category_name])
    return result.rows[0]
}

const deleteStockCategory = async (category_id, schema) => {
    await pool.query(`DELETE FROM ${schema}.stock_categories WHERE id=$1`, [category_id])
}
module.exports={
    getAllStockItens,
    insertItemInStock,
    alterItemQuantityInStock,
    getItemById,
    updateItemInStock,
    createStockCategory,
    getStockCategories,
    deleteStockCategory
}