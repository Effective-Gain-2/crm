const { deleteAllExpensesItens, insertExpenseItens, insertExpenseItensTax } = require("../services/ExpensesService");
const { createReceita, getReceitas, getReceitaById, updateReceita, deleteReceita, getReceitasStats, testConnection } = require("../services/ReceitaService");

const createReceitaController = async (req, res) => {
    const { nome, user_id, category_id, valor_receita, data, payment_method, status, itens=[], schema } = req.body;
    console.log(req.body)
    try {
        const result = await createReceita(nome, user_id, category_id, valor_receita, data, payment_method, status, schema);
        await deleteAllExpensesItens(result.id, schema)
        
        for(const item of itens){
            // Validar dados do item antes de inserir
            if (!item.descricao || !item.quantidade || !item.valor) {
                console.warn('Item inválido:', item);
                continue;
            }
            
            const expense_item = await insertExpenseItens(
                result.id, 
                item.descricao, 
                item.observacoes, 
                item.quantidade, 
                item.valor, 
                item.hasTax, 
                schema
            );
            
            const itemTax = item.tax || [];
            if(itemTax.length > 0 && itemTax[0]){
                await insertExpenseItensTax(expense_item.id, itemTax[0], expense_item.subtotal, schema)
            }
        }

        res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getReceitasController = async (req, res) => {
    const { schema } = req.params;
    
    try {
        const receitas = await getReceitas(schema);
        res.status(200).json({ success: true, data: receitas });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getReceitaByIdController = async (req, res) => {
    const { receita_id, schema } = req.params;
    
    try {
        const result = await getReceitaById(receita_id, schema);
        
        if (!result) {
            return res.status(404).json({ success: false, message: 'Receita não encontrada' });
        }
        
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const updateReceitaController = async (req, res) => {
    const { receita_id, schema } = req.params;
    const { nome, valor_receita, status } = req.body;
    
    try {
        const result = await updateReceita(receita_id, nome, valor_receita, status, schema);
        
        if (!result) {
            return res.status(404).json({ success: false, message: 'Receita não encontrada' });
        }
        
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const deleteReceitaController = async (req, res) => {
    const { receita_id, schema } = req.body;
    try {
        const result = await deleteReceita(receita_id, schema);
        res.status(200).json({ success: true, message: 'Receita excluída com sucesso' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getReceitasStatsController = async (req, res) => {
    const { schema } = req.params;
    
    try {
        const stats = await getReceitasStats(schema);
        res.status(200).json({ success: true, data: stats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const testConnectionController = async (req, res) => {
    try {
        const result = await testConnection();
        res.status(200).json({ success: true, data: { connected: result } });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getMonthlyGainController = async (req, res) => {
    const { year, month, schema } = req.params;
    try {
        const { calculateMonthlyGain } = require('../utils/CalculateMonthly');
        const result = await calculateMonthlyGain(parseInt(year), parseInt(month), schema);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getLastNMonthsGainController = async (req, res) => {
    const { months, schema } = req.params;
    try {
        const { calculateLastNMonthsGain } = require('../utils/CalculateMonthly');
        const result = await calculateLastNMonthsGain(parseInt(months), schema);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getNextNMonthsProjectionController = async (req, res) => {
    const { months, schema } = req.params;
    try {
        const { calculateNextNMonthsProjection } = require('../utils/CalculateMonthly');
        const result = await calculateNextNMonthsProjection(parseInt(months), schema);
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = {
    createReceitaController,
    getReceitasController,
    getReceitaByIdController,
    updateReceitaController,
    deleteReceitaController,
    getReceitasStatsController,
    testConnectionController,
    getMonthlyGainController,
    getLastNMonthsGainController,
    getNextNMonthsProjectionController
};