const express = require('express');
const { createCompanyController, getAllCompaniesController, getAllCompaniesTecUserController, updateSchemaController, renameCompanyController } = require('../controllers/CompanyController');

const router = express.Router();

router.post('/company', createCompanyController)
router.get('/companies', getAllCompaniesController)
router.get('/tecnico', getAllCompaniesTecUserController)
router.post('/update-schema', updateSchemaController)
router.put('/rename', renameCompanyController)

module.exports = router