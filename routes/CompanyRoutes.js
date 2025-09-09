const express = require('express');
const { createCompanyController, getAllCompaniesController, getAllCompaniesTecUserController, updateSchemaController } = require('../controllers/CompanyController');

const router = express.Router();

router.post('/company', createCompanyController)
router.get('/companies', getAllCompaniesController)
router.get('/tecnico', getAllCompaniesTecUserController)
router.post('/update-schema', updateSchemaController)

module.exports = router