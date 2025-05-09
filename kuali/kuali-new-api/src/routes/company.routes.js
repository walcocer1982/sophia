const router = require('express').Router();
const ctrl = require('../controllers/company.controller');

router.get('/',  ctrl.getAllCompanies);
router.post('/', ctrl.createCompany);

module.exports = router; 