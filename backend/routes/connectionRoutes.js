const express = require('express');
const router = express.Router();
const connectionController = require('../controllers/connectionController');
const { validateConnectionInput } = require('../middleware/validator');

router.post('/', validateConnectionInput, connectionController.createConnection);
router.get('/', connectionController.getAllConnections);
router.get('/:id', connectionController.getConnectionById);
router.put('/:id', connectionController.updateConnection);
router.delete('/:id', connectionController.deleteConnection);

module.exports = router;
