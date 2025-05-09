const repo = require('../repositories/company.repo');

async function getAllCompanies() {
  return repo.findAll();
}

async function createCompany(data) {
  return repo.create({ name: data.name, sector: data.sector });
}

module.exports = { getAllCompanies, createCompany }; 