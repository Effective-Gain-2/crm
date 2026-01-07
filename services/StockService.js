const { retail } = require("googleapis/build/src/apis/retail");
const pool = require("../db/queries")
const { v4: uuidv4 } = require('uuid');
const { getAssistantReply, createThread, getAssistantMessageWithoutThreadId } = require("./OpenAi");


const getAllStockItens = async (schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.stock`)
    return result.rows 
}

const insertItemInStock = async (item, quantity, category, atention_quantity, urgent_quantity, schema) => {
    const result = await pool.query(`INSERT INTO ${schema}.stock (id, item, quantity, category, atention_quantity, urgent_quantity) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`, [uuidv4(), item, quantity, category, atention_quantity||null, urgent_quantity||null])
    return result.rows[0]
}

const getItemById = async (item_id, schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.stock WHERE id=$1`,[item_id])
    return result.rows[0]
}

const alterItemQuantityInStock = async (item_id, quantity, isSum, schema) => {
    const currentQuantity = await getItemById(item_id, schema)
    if(isSum){
        const result = await pool.query(`UPDATE ${schema}.stock set quantity=$1 WHERE id=$2 RETURNING *`, [(currentQuantity.quantity + Number(quantity)), item_id])
        return result.rows[0]
    }else{
        const result = await pool.query(`UPDATE ${schema}.stock set quantity=$1 WHERE id=$2 RETURNING *`, [(currentQuantity.quantity - quantity), item_id])
        return result.rows[0]
    }

}

const updateItemInStock = async (item_id, item_name, category, quantity, atention_quantity, urgent_quantity, schema) => {
    const result = await pool.query(`UPDATE ${schema}.stock set item=$1, category=$2, quantity=$3, atention_quantity=$5, urgent_quantity=$6 where id=$4 RETURNING *`,[item_name, category, quantity, item_id, atention_quantity || null, urgent_quantity || null])
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

const getItemByName = async (item, schema) => {
    // Use GPT to normalize the item name (ex: "AGUA SANITARIA 1L MARCA X" -> "AGUA SANITARIA")
    let gptResponse = null
    try{
        const raw = await getAssistantMessageWithoutThreadId(JSON.stringify(item),'asst_3XbgVooS6gHQbs4bbjiRboVX')
        gptResponse = JSON.parse(raw)
    }catch(err){
        // if GPT response isn't valid JSON, fallback to original item
        console.warn('GPT normalization failed, falling back to raw item:', err && err.message)
        gptResponse = null
    }
    const itens = await pool.query(`SELECT * FROM ${schema}.stock`)
    const needle = (gptResponse && gptResponse.item) ? String(gptResponse.item).toLowerCase() : String(item).toLowerCase()
    const result = itens.rows.filter(item_stock => String(item_stock.item || '').toLowerCase().includes(needle))
    if (result && result.length > 0) {
        return { item: result, found: true }

    }
    return { item: item, found: false }
}
module.exports={
    getAllStockItens,
    insertItemInStock,
    alterItemQuantityInStock,
    getItemById,
    updateItemInStock,
    createStockCategory,
    getStockCategories,
    deleteStockCategory,
    getItemByName
}