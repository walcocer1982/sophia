const prisma = require('../config/database');

function findAllWithCompany() {
  return prisma.lead.findMany({ include: { company: true } });
}

function create(data) {
  return prisma.lead.create({
    data: {
      ...data,
      company: { connect: { id: data.companyId } }
    }
  });
}

module.exports = { findAllWithCompany, create }; 