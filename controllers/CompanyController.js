const { v4: uuidv4 } = require('uuid');
const { Company } = require('../entities/company');
const { createCompany, getAllCompanies, getAllCompaniesTecUser, updateSchema } = require('../services/CompanyService');

const createCompanyController = async (req, res) => {
    try {
        const { name, superAdmin } = req.body;
        const schemaName = req.body.schema_name;

        const newCompany = new Company(uuidv4(), name, superAdmin);
        const result = await createCompany(newCompany, schemaName); 

        res.status(201).json({
            message: 'Empresa criada'
        });
    } catch (error) {
        console.error("Erro ao criar empresa:", error);
        res.status(500).json({
            message: 'Erro ao criar empresa'
        });
    }
};

const getAllCompaniesController = async(req, res)=>{
    try{
        const result = await getAllCompanies();
        res.status(201).json({
            empresas: result
        })
    }catch(error){
        console.error(error)
        res.status(500).json({
            message:"Erro ao buscar empresas"
        })
    }
}
const getAllCompaniesTecUserController = async(req, res)=>{
    try{
        const result = await getAllCompaniesTecUser();
        res.status(201).json({
            empresas: result
        })
    }catch(error){
        console.error(error)
        res.status(500).json({
            message:"Erro ao buscar empresas"
        })
    }
}

const updateSchemaController = async (req, res) => {
    try {
        const { schema } = req.body;
        
        if (!schema) {
            return res.status(400).json({
                message: 'Schema é obrigatório'
            });
        }

        const result = await updateSchema(schema);
        
        res.status(200).json({
            message: result.message
        });
    } catch (error) {
        console.error("Erro ao atualizar schema:", error);
        res.status(500).json({
            message: 'Erro ao atualizar schema',
            error: error.message
        });
    }
};

module.exports = { createCompanyController, getAllCompaniesController, getAllCompaniesTecUserController, updateSchemaController };