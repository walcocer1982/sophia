const express = require('express');
const router = express.Router();
const dniController = require('../controllers/dniController');

router.get('/:numero', dniController.getDniInfo);

module.exports = router;