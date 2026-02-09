const { getReports, summary, getSummaryByChatId } = require("../services/ReportService");
const XLSX = require("xlsx");

const getReportsController = async (req, res) => {
    const schema = req.schema
    const { user_id, user_role } = req.query;
    try {
        const result = await getReports(schema, user_id, user_role)
        res.status(200).json({
            success: true,
            result
        })
    } catch (error) {
        console.error(error)
        res.status(400).json({
            success:false
        })
    }
}
const generateSummaryController = async (req, res) => {
    const {chat_id} = req.body
    const schema = req.schema
    try {
        const result = await summary(chat_id, schema)
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

const getSummaryController = async (req, res) => {
    const {chat_id} = req.params
    const schema = req.schema

    try {
        const result = await getSummaryByChatId(chat_id, schema)
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

// Download do arquivo sales.xlsx em E:\\crm\\crm
const normalizeSalesRows = (payload) => {
    if (!payload) {
        return [{ message: "Sem dados retornados" }];
    }

    if (Array.isArray(payload)) {
        return payload.length ? payload : [{ message: "Sem dados retornados" }];
    }

    const candidateKeys = [
        "orders",
        "sales",
        "data",
        "items",
        "results",
        "content",
        "elements",
        "value"
    ];

    for (const key of candidateKeys) {
        if (Array.isArray(payload[key])) {
            return payload[key].length ? payload[key] : [{ message: "Sem dados retornados" }];
        }
    }

    return [payload];
};

const formatRow = (row) => {
    if (!row || typeof row !== "object") {
        return { valor: row };
    }

    const formatted = {};
    for (const [key, value] of Object.entries(row)) {
        formatted[key] =
            value && typeof value === "object" ? JSON.stringify(value) : value;
    }
    return formatted;
};


module.exports = {
    getReportsController,
    generateSummaryController,
    getSummaryController,
    
}

