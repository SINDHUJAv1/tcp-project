const express = require('express');
const router = express.Router();
const fsmController = require('../controllers/fsmController');

router.get('/state', fsmController.getFSMState);
router.post('/transition', fsmController.triggerTransition);
router.post('/reset', fsmController.resetFSM);
router.get('/spec', fsmController.getFormalSpec);

module.exports = router;
