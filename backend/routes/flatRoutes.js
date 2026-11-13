const express = require('express');
const router = express.Router();
const flatController = require('../controllers/flatController');

router.post('/validate-regex', flatController.validateRegex);
router.get('/regex-details', flatController.getRegexDetails);
router.get('/cfg', flatController.getCFG);
router.get('/derivation', flatController.getDerivation);
router.post('/parse-cfg', flatController.parseCFG);
router.get('/pda', flatController.getPDA);
router.post('/simulate-pda', flatController.simulatePDA);
router.get('/turing-machine', flatController.getTuringMachine);
router.post('/simulate-tm', flatController.simulateTM);

module.exports = router;
