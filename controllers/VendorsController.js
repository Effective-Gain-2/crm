const { getVendors, createVendor } = require("../services/VendorService");

const createVendorController = async (req, res) => {
    const { vendor_name, schema } = req.body;

    try {
        const result = await createVendor(vendor_name, schema);
        res.status(201).json({ success: true, data: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

const getVendorsController = async (req,res)=>{
    const schema = req.params.schema;

    try {
        const vendors = await getVendors(schema);
        res.status(200).json({ success: true, data: vendors });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    createVendorController,
    getVendorsController
};