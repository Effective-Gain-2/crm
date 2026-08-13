const express = require('express');
const { upload, uploadFileController } = require('../controllers/FileUpload');
const { enforceSchema } = require('../middlewares/enforceSchema');
const router = express.Router();

router.post('/upload', upload.single('file'), enforceSchema, uploadFileController);

module.exports = router;