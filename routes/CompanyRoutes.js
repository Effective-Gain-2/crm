const express = require('express');
const { createCompanyController, getAllCompaniesController, getAllCompaniesTecUserController, updateSchemaController, setSchemaController } = require('../controllers/CompanyController');
const { allowedRoles } = require('../middlewares/RequireUser');
const { verifyToken } = require('../controllers/UserController');

const router = express.Router();

router.post('/company', verifyToken, allowedRoles('tec'), createCompanyController)
router.get('/companies', verifyToken, allowedRoles('tec'), getAllCompaniesController)
router.get('/tecnico', verifyToken, allowedRoles('tec'), getAllCompaniesTecUserController)
router.post('/update-schema', verifyToken, allowedRoles('tec'), updateSchemaController)
router.post('/set-schema', verifyToken, allowedRoles('tec'), setSchemaController)

module.exports = router