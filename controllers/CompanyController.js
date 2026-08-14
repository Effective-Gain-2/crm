const { v4: uuidv4 } = require('uuid');
const pool = require('../db/queries');
const { Company } = require('../entities/company');
const { createCompany, getAllCompanies, getAllCompaniesTecUser, updateSchema } = require('../services/CompanyService');
const { createOrAttachUser } = require('../services/AuthService');
const { invalidateSchemaCache } = require('../utils/validateSchema');

// POST /company/company — técnico cria empresa (+ master inicial com conta global)
const createCompanyController = async (req, res) => {
    try {
        const { name, superAdmin } = req.body;
        const schemaName = req.body.schema_name;
        if (!name || !schemaName) {
            return res.status(400).json({ message: 'Nome e schema_name são obrigatórios' });
        }

        const newCompany = new Company(uuidv4(), name, superAdmin);
        const result = await createCompany(newCompany, schemaName);
        invalidateSchemaCache();

        // Conta global para o master inicial (senão ele não consegue logar)
        if (superAdmin?.email && superAdmin?.password) {
            const companyRow = await pool.query(
                `SELECT id FROM effective_gain.companies WHERE schema_name = $1`,
                [schemaName]
            );
            if (companyRow.rows[0]) {
                await createOrAttachUser({
                    name: superAdmin.name || superAdmin.email,
                    email: superAdmin.email,
                    password: superAdmin.password,
                    role: 'master',
                    companyId: companyRow.rows[0].id,
                    grantedBy: req.auth.account_id,
                });
            }
        }

        res.status(201).json({ message: result.message || 'Empresa criada' });
    } catch (error) {
        console.error('Erro ao criar empresa:', error);
        res.status(500).json({ message: 'Erro ao criar empresa', error: error.message });
    }
};

const getAllCompaniesController = async (req, res) => {
    try {
        const result = await getAllCompanies();
        res.status(200).json({ empresas: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar empresas' });
    }
};

const getAllCompaniesTecUserController = async (req, res) => {
    try {
        const result = await getAllCompaniesTecUser();
        res.status(200).json({ empresas: result });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Erro ao buscar empresas' });
    }
};

const updateSchemaController = async (req, res) => {
    try {
        const { schema } = req.body;
        if (!schema) {
            return res.status(400).json({ message: 'Schema é obrigatório' });
        }
        const result = await updateSchema(schema);
        res.status(200).json({ message: result.message });
    } catch (error) {
        console.error('Erro ao atualizar schema:', error);
        res.status(500).json({ message: 'Erro ao atualizar schema', error: error.message });
    }
};

// PUT /company/rename — corrige o nome de exibição de uma empresa (técnico)
const renameCompanyController = async (req, res) => {
    try {
        const { schema_name, company_name } = req.body;
        if (!schema_name || !company_name) {
            return res.status(400).json({ message: 'schema_name e company_name são obrigatórios' });
        }
        const pool = require('../db/queries');
        const result = await pool.query(
            `UPDATE effective_gain.companies SET company_name = $1 WHERE schema_name = $2 RETURNING id, company_name, schema_name`,
            [company_name, schema_name]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: 'Empresa não encontrada' });
        res.status(200).json({ success: true, company: result.rows[0] });
    } catch (error) {
        console.error('Erro ao renomear empresa:', error);
        res.status(500).json({ message: 'Erro ao renomear empresa' });
    }
};

module.exports = { createCompanyController, getAllCompaniesController, getAllCompaniesTecUserController, updateSchemaController, renameCompanyController };
