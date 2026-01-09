const express = require('express');
const { 
  createConnectionController, 
  setQueueController, 
  getAllConnectionsController, 
  deleteConnectionController, 
  searchConnByIdController, 
  getAllConnectionsWithStatusController, 
  deleteApiOfcDataController,
  getAllApiOfcConnectionsController
} = require('../controllers/ConnectionController');
const { allowedRoles } = require('../middlewares/RequireUser');
const router = express.Router();

router.get('/get-all-connections/:schema', allowedRoles(), getAllConnectionsController);
router.get('/get-all-connections-status/:schema', allowedRoles(),getAllConnectionsWithStatusController);
router.get('/get-all-api-ofc-connections/:schema',allowedRoles(), getAllApiOfcConnectionsController);
router.get('/search-conn-by-id/:connection_id/:schema', allowedRoles(), searchConnByIdController);
router.post('/create', allowedRoles('tec-admin', true, 'Conexão criada'), createConnectionController);
router.post('/setConnQueue', allowedRoles('tec-admin', true, 'Fila da conexão atualizada'), setQueueController);
router.delete('/delete/:connection_id/:instanceName/:schema', allowedRoles('tec-admin', true, 'Conexão deletada'), deleteConnectionController);
router.delete('/delete-api-ofc-data/:phone_id/:schema', allowedRoles('tec-admin', true, 'Dados da API OFC deletados'), deleteApiOfcDataController);

module.exports = router;