const service = require('../services/company.service');

exports.getAllCompanies = async (req, res, next) => {
  try {
    const data = await service.getAllCompanies();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.createCompany = async (req, res, next) => {
  try {
    const created = await service.createCompany(req.body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}; 