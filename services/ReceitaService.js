const pool = require('../db/queries');
const { v4: uuidv4 } = require('uuid');

const createReceita = async (nome, user_id, category_id, valor_receita, due_date, payment_method, status = 'ativo',schema) => {
    const result = await pool.query(
        `INSERT INTO ${schema}.receitas (id, name, user_id, category_id, total_amount, due_date, payment_method, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [uuidv4(), nome, user_id, category_id, valor_receita, due_date || null, payment_method, status, new Date().toISOString()]
    );
    return result.rows[0];
};

const getReceitas = async (schema) => {
    const result = await pool.query(`SELECT * FROM ${schema}.receitas `);
    return result.rows;
};

const getReceitaById = async (receita_id, schema) => {
    const receita = await pool.query(`SELECT * FROM ${schema}.receitas WHERE id = $1`, [receita_id]);
    
    if (receita.rows.length === 0) {
        return null;
    }
    
    // Buscar itens da receita diretamente
    const receita_items = await pool.query(`SELECT * FROM ${schema}.financial_items WHERE financial_id = $1`, [receita_id]);
    // Buscar categoria
    let category_name = null;
    if (receita.rows[0]?.category_id) {
        const category = await pool.query(`SELECT category_name FROM ${schema}.category WHERE id = $1`, [receita.rows[0].category_id]);
        category_name = category.rows[0]?.category_name || null;
    }
    
    // Buscar fornecedor
    let vendor_name = null;
    if (receita.rows[0]?.vendor_id) {
        const vendor = await pool.query(`SELECT vendor_name FROM ${schema}.vendors WHERE id = $1`, [receita.rows[0].vendor_id]);
        vendor_name = vendor.rows[0]?.vendor_name || null;
    }
    
    let items = [];
    let taxes = [];
    for (const item of receita_items.rows) {
        const financial_items_taxes = await pool.query(`SELECT * FROM ${schema}.financial_item_taxes WHERE financial_item_id = $1`, [item.id]);
        
        // Buscar informações completas dos impostos do item
        const itemTaxes = [];
        for (const itemTax of financial_items_taxes.rows) {
            const taxRate = await pool.query(`SELECT * FROM ${schema}.tax_rates WHERE id = $1`, [itemTax.tax_rate_id]);
            if (taxRate.rows[0]) {
                itemTaxes.push({
                    ...itemTax,
                    tax_rate: taxRate.rows[0],
                    tax_name: taxRate.rows[0].name,
                    tax_rate_percentage: taxRate.rows[0].rate,
                    base_amount: itemTax.base_amount,
                    tax_amount: itemTax.tax_amount
                });
            }
        }
        
        items.push({ 
            ...item, 
            taxes: itemTaxes,
            total_with_taxes: (Number(item.subtotal) || 0) + itemTaxes.reduce((sum, tax) => sum + (Number(tax.tax_amount) || 0), 0)
        });
        
        // Adicionar impostos à lista geral
        taxes.push(...itemTaxes);
    }
    return {
        receita: receita.rows[0],
        category_name: category_name,
        vendor_name: vendor_name,
        items: items,
        taxes: taxes
    };
};

const updateReceita = async (receita_id, nome, valor_receita, status, schema) => {
    const result = await pool.query(
        `UPDATE ${schema}.receitas 
         SET nome = COALESCE($1, nome), 
             valor_receita = COALESCE($2, valor_receita), 
             status = COALESCE($3, status),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4
         RETURNING *`,
        [nome, valor_receita, status, receita_id]
    );
    
    if (result.rows.length === 0) {
        return null;
    }
    
    return result.rows[0];
};

const deleteReceita = async (receita_id, schema) => {
    const result = await pool.query(
        `UPDATE ${schema}.receitas 
         SET status = 'inativo', updated_at = CURRENT_TIMESTAMP
         WHERE id = $1
         RETURNING *`,
        [receita_id]
    );
    
    if (result.rows.length === 0) {
        return false;
    }
    
    return true;
};

const getReceitasStats = async (schema) => {
    const result = await pool.query(
        `SELECT 
            COUNT(*) as total_receitas,
            SUM(CASE WHEN status = 'ativo' THEN 1 ELSE 0 END) as receitas_ativas,
            SUM(CASE WHEN status = 'inativo' THEN 1 ELSE 0 END) as receitas_inativas,
            SUM(CASE WHEN status = 'ativo' THEN valor_receita ELSE 0 END) as valor_total_ativas
         FROM ${schema}.receitas`
    );
    return result.rows[0];
};

const testConnection = async () => {
    try {
        const result = await pool.query('SELECT NOW() as current_time, version() as db_version');
        return true;
    } catch (error) {
        console.error('Erro na conexão com PostgreSQL:', error);
        return false;
    }
};

const getReceitasByMonth = async (year, month, schema) => {
    const result = await pool.query(
        `SELECT * FROM ${schema}.receitas 
         WHERE EXTRACT(YEAR FROM created_at) = $1 
         AND EXTRACT(MONTH FROM created_at) = $2
         AND status = 'ativo'
         ORDER BY created_at DESC`,
        [year, month]
    );
    return result.rows;
};

const getReceitasByDateRange = async (startDate, endDate, schema) => {
    const result = await pool.query(
        `SELECT * FROM ${schema}.receitas 
         WHERE created_at >= $1 AND created_at <= $2
         AND status = 'ativo'
         ORDER BY created_at DESC`,
        [startDate, endDate]
    );
    return result.rows;
};

module.exports = {
    createReceita,
    getReceitas,
    getReceitaById,
    updateReceita,
    deleteReceita,
    getReceitasStats,
    testConnection,
    getReceitasByMonth,
    getReceitasByDateRange
};