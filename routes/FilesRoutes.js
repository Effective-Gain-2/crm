const express = require('express');
const { upload, uploadFileController } = require('../controllers/FileUpload');
const router = express.Router();

router.post('/upload', upload.single('file'), uploadFileController);

module.exports = router;