const express = require('express');
const { createCompanyController, getAllCompaniesController, getAllCompaniesTecUserController } = require('../controllers/CompanyController');

const router = express.Router();

router.post('/company', createCompanyController)
router.get('/companies', getAllCompaniesController)
router.get('/tecnico', getAllCompaniesTecUserController)

module.exports = router