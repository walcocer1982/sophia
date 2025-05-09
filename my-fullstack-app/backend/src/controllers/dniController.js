const dniService = require('../services/dniService');

exports.getDniInfo = async (req, res) => {
  try {
    const dniNumber = req.params.numero;
    const dniInfo = await dniService.fetchDniInfo(dniNumber);
    res.json(dniInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
