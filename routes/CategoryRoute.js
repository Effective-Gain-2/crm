const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { getCategoriesController, createCategoryController } = require('../controllers/CategoryController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.get('/get-categories/:schema', verifyToken, allowedRoles(), getCategoriesController)
router.post('/create-category', verifyToken, allowedRoles(), createCategoryController)

module.exports = router;
