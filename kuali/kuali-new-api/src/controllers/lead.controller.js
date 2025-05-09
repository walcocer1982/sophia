const service = require('../services/lead.service');

exports.getAllLeads = async (req, res, next) => {
  try {
    const data = await service.getAllLeads();
    res.json(data);
  } catch (e) {
    next(e);
  }
};

exports.createLead = async (req, res, next) => {
  try {
    const created = await service.createLead(req.body);
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
}; 