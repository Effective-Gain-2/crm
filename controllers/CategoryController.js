const { getCategories, createCategory } = require("../utils/Category");

const createCategoryController = async (req, res) => {
    const {name, schema} = req.body;
    try {
        const result = await createCategory(name, schema);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const getCategoriesController = async (req, res) => {
    const schema = req.params.schema;

    try{
        const categories = await getCategories(schema);
        res.status(200).json({ success: true, data: categories });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }

}

module.exports = {
    createCategoryController,
    getCategoriesController
};