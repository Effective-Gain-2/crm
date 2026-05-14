const express = require('express');
const multer = require('multer');
const path = require('path');
const DocumentController = require('../controllers/DocumentController');
const errorHandler = require('../middlewares/ErrorHandler');
const { verifyToken } = require('../controllers/UserController');
const { allowedRoles } = require('../middlewares/RequireUser');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'documents'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const fileFilter = (req, file, cb) => {
  const validMimeTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword' // .doc
  ];
  
  if (validMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado! Apenas PDF, Excel e Word são permitidos.'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

router.post('/upload', verifyToken, allowedRoles(), upload.single('file'), DocumentController.uploadDocument);
router.get('/', verifyToken, allowedRoles(), DocumentController.getDocuments);
router.delete('/:id', verifyToken, allowedRoles('tec-admin', true, 'Documento deletado'), DocumentController.deleteDocument);

router.use(errorHandler);

module.exports = router;
