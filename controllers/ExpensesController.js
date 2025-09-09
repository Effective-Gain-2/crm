const { createExpense, getExpenses, deleteAllExpensesItens, insertExpenseItens, createTaxRate, getTaxRates, insertExpenseItensTax, getExpensesById, deleteExpense, getExpenseItemById } = require("../services/ExpensesService");

const createExpenseController = async (req, res) => {
    const {user_id, vendor_id, description, category_id, total_amount, currency, date_incurred, due_date, payment_date, payment_method, status, created_at, itens=[], schema } = req.body;
    try {
        const result = await createExpense(user_id, vendor_id, description, category_id, total_amount, currency, date_incurred, due_date, payment_date, payment_method, status, created_at, schema);
        await deleteAllExpensesItens(result.id, schema)
        for(const item of itens){
            const expense_item = await insertExpenseItens(result.id, item.descricao, item.observacoes, item.quantidade, item.unit_price, item.hasTax, schema)
            const itemTax = item.tax
            if(itemTax.length>0){
                await insertExpenseItensTax(expense_item.id, itemTax[0] || null, expense_item.subtotal, schema)
            }
         }
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const getExpensesController = async (req, res) => {
    const { schema } = req.params;
    try {
        const expenses = await getExpenses(schema);
        res.status(200).json({ success: true, data: expenses });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const createTaxRateController = async (req, res) => {
    const { name, rate, type, is_compound, schema } = req.body;
    try {
        const result = await createTaxRate(name, rate, type, is_compound, schema);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const getTaxRatesController = async (req, res) => {
    const { schema } = req.params;
    try {
        const taxRates = await getTaxRates(schema);
        res.status(200).json({ success: true, data: taxRates });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const getExpensesByIdController = async (req, res) => {
    const { expense_id, schema } = req.params;
    try {
        const result = await getExpensesById(expense_id, schema)
        res.status(200).json({ success: true, data: result });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const deleteExpenseController = async (req, res) => {
    const {expense_id, schema} = req.body
    try {
        await deleteExpense(expense_id, schema)
        res.status(200).json({ success: true});
    } catch (error) {
         console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const getExpenseItemByIdController = async (req, res) => {
    const {expense_item_id, schema} = req.params
    try {
        const result = await getExpenseItemById(expense_item_id, schema)
        res.status(200).json({ success: true, data: result});

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    createExpenseController,
    getExpensesController,
    createTaxRateController,
    getTaxRatesController,
    getExpensesByIdController,
    deleteExpenseController,
    getExpenseItemByIdController
}