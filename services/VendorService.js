const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');

const createVendor = async (vendor_name, schema) => {
    const result = await pool.query(
        `INSERT INTO ${schema}.vendors (id, vendor_name) VALUES ($1, $2) RETURNING *`,
        [uuidv4(), vendor_name]
    );
    return result.rows[0];
}

const getVendors = async (schema) => {
    const result = await pool.query(
        `SELECT * FROM ${schema}.vendors`
    );
    return result.rows; 
}

module.exports = {
    createVendor,
    getVendors
}