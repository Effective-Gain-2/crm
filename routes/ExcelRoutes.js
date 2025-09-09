const express = require('express');
const multer = require('multer');
const path = require('path');
const ExcelController = require('../controllers/ExcelController');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

router.post('/upload', upload.single('file'), ExcelController.uploadExcel);

module.exports = router;