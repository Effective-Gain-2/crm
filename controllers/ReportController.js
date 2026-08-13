const { getReports } = require("../services/ReportService")

const getReportsController = async (req, res) => {
    // Escopo derivado do token — nunca do cliente
    const schema = req.auth.schema;
    const user_id = req.auth.local_user_id;
    const user_role = req.auth.role;
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

module.exports = {
    getReportsController
}