const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');

const createCategory = async(name, schema)=>{
    const result = await pool.query(
        `INSERT INTO ${schema}.category (id, category_name) VALUES ($1, $2) RETURNING id, category_name as name`,
        [uuidv4(), name]
    );
    return result.rows[0];
}

const getCategories = async(schema)=>{
    const result = await pool.query(
        `SELECT id, category_name as name FROM ${schema}.category`
    );
    return result.rows;
}

module.exports = {
    createCategory,
    getCategories
}