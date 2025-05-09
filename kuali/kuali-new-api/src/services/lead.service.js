const repo = require('../repositories/lead.repo');

async function getAllLeads() {
  return repo.findAllWithCompany();
}

async function createLead(data) {
  return repo.create({
    firstName:   data.firstName,
    lastName:    data.lastName,
    email:       data.email,
    phoneNumber: data.phoneNumber,
    linkedinUrl: data.linkedinUrl,
    role:        data.role,
    seniority:   data.seniority,
    companyId:   data.companyId
  });
}

module.exports = { getAllLeads, createLead }; 