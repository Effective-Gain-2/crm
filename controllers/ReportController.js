const { getReports, summary, getSummaryByChatId } = require("../services/ReportService")

const getReportsController = async (req, res) => {
    const {schema} = req.params
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
    const {chat_id, schema} = req.body
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
    const {chat_id, schema} = req.params

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
module.exports = {
    getReportsController,
    generateSummaryController,
    getSummaryController
}

