const express = require('express');
const { createCompanyController, getAllCompaniesController, getAllCompaniesTecUserController, updateSchemaController } = require('../controllers/CompanyController');
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router();

router.post('/company', allowedRoles('tec'), createCompanyController)
router.get('/companies', allowedRoles('tec'), getAllCompaniesController)
router.get('/tecnico', allowedRoles('tec'), getAllCompaniesTecUserController)
router.post('/update-schema', allowedRoles('tec'), updateSchemaController)

module.exports = router