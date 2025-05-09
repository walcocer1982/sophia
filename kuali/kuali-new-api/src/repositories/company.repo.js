const prisma = require('../config/database');

function findAll() {
  return prisma.company.findMany();
}

function create(data) {
  return prisma.company.create({ data });
}

module.exports = { findAll, create }; 