const express = require('express');
const multer = require('multer');
const path = require('path');
const { getListasController, uploadListaController, renomearListaController, deleteListaController } = require('../controllers/ListaController');
const { enforceSchema } = require('../middlewares/enforceSchema');

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

router.get('/', getListasController);
// enforceSchema reaplicado APOS o multer: ele repopula req.body no multipart.
router.post('/upload', upload.single('file'), enforceSchema, uploadListaController);
router.put('/:lista_id', renomearListaController);
router.delete('/:lista_id', deleteListaController);

module.exports = router;
