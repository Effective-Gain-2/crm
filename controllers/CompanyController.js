const { v4: uuidv4 } = require('uuid');
const { Company } = require('../entities/company');
const { createCompany, getAllCompanies, getAllCompaniesTecUser, updateSchema, createCompanySelfService } = require('../services/CompanyService');
const { returnForbiddenError } = require('../Errors/Errors');
const jwt = require('jsonwebtoken');
const { insertLimits } = require('../services/LimitsService');
const { createPaymentRequestQrCode } = require('../requests/payment');

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
const createCompanySelfServiceController = async (req, res) => {
    try{
        const { empresa_name, name, email, password, cpf } = req.body;
        const company = await createCompanySelfService(empresa_name, name, email, password);
        await insertLimits('payment', false, null, company.schema);
        const qr_code = await createPaymentRequestQrCode(
            name,
            email,
            cpf,
            `Assinatura - ${empresa_name}`,
            500
        );
        res.status(201).json({
            message: qr_code.qr_codes[0].links[0].href
        })
    }catch(error){
        console.error("Erro ao criar empresa:", error);
        res.status(500).json({
            message: 'Erro ao criar empresa'
        });
    }
}

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

const setSchemaController = async (req, res) => {
    const { schema } = req.body;
    const {user_id, user_role} = req;
    try {
        const token = jwt.sign(
              { user_id: user_id, schema:schema, user_role: user_role  },
              process.env.JWT_SECRET,
              { expiresIn: '15m' }
            );
        
            const refreshToken = jwt.sign(
              { user_id: user_id, schema:schema, user_role: user_role },
              process.env.JWT_SECRET,
              { expiresIn: '7d' }
            );

            res.cookie('token', token, {
      maxAge: 15 * 60 * 1000, // 15 minutos em millisegundos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
    });

    res.cookie('refreshToken', refreshToken, {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias em millisegundos
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
    });

    res.status(200).json({
      success: true,
      user: user_id,
      role: user_role,
      company: schema,
      schema: schema
    });
    } catch (error) {
        console.error("Erro ao definir schema:", error);
        returnForbiddenError(res)
    }
}

module.exports = { createCompanyController, getAllCompaniesController, getAllCompaniesTecUserController, updateSchemaController, setSchemaController, createCompanySelfServiceController };