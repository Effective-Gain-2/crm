const { v4: uuidv4 } = require('uuid');
const { Company } = require('../entities/company');
const { createCompany, getAllCompanies, getAllCompaniesTecUser } = require('../services/CompanyService');

const createCompanyController = async (req, res) => {
    try {
        const { name, superAdmin } = req.body;
        const schemaName = req.body.schema_name;
        console.log(req.body)

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
        console.log(error)
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
        console.log(error)
        res.status(500).json({
            message:"Erro ao buscar empresas"
        })
    }
}

module.exports = { createCompanyController, getAllCompaniesController, getAllCompaniesTecUserController};