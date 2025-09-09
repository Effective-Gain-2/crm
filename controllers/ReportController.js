const { getReports } = require("../services/ReportService")

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

module.exports = {
    getReportsController
}