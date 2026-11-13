const express = require('express');
const router = express.Router();
const simulatorController = require('../controllers/simulatorController');

router.get('/session', simulatorController.getSession);
router.post('/connect', simulatorController.connect);
router.post('/send-data', simulatorController.sendData);
router.post('/corrupt-packet', simulatorController.corruptPacket);
router.post('/wait', simulatorController.wait);
router.post('/disconnect', simulatorController.disconnect);
router.post('/reset', simulatorController.reset);

// Sliding Window Flow Control
router.get('/sliding-window', simulatorController.getSlidingWindow);
router.post('/sliding-window/send', simulatorController.slidingWindowSend);
router.post('/sliding-window/ack', simulatorController.slidingWindowAck);
router.post('/sliding-window/fill-buffer', simulatorController.slidingWindowFillBuffer);
router.post('/sliding-window/free-buffer', simulatorController.slidingWindowFreeBuffer);
router.post('/sliding-window/probe', simulatorController.slidingWindowProbe);
router.post('/sliding-window/reset', simulatorController.slidingWindowReset);

module.exports = router;
