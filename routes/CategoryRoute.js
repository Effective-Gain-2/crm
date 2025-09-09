const express = require('express');
const { verifyToken } = require('../controllers/UserController');
const { getCategoriesController, createCategoryController } = require('../controllers/CategoryController');
const router = express.Router();

router.get('/get-categories/:schema', verifyToken, getCategoriesController)
router.post('/create-category', verifyToken, createCategoryController)

module.exports = router;
