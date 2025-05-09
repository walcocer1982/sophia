const router = require('express').Router();
const ctrl = require('../controllers/lead.controller');

router.get('/',  ctrl.getAllLeads);
router.post('/', ctrl.createLead);

module.exports = router; 