const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    // Intenta contar los registros en la tabla Company
    const companiesCount = await prisma.company.count();
    console.log(`La tabla Company tiene ${companiesCount} registros`);
    
    // Si hay registros, muestra algunos
    if (companiesCount > 0) {
      const companies = await prisma.company.findMany({ take: 5 });
      console.log('Primeras 5 empresas:', companies);
    }
    
    // Revisa también los leads
    const leadsCount = await prisma.lead.count();
    console.log(`La tabla Lead tiene ${leadsCount} registros`);
    
  } catch (error) {
    console.error('Error al conectar con la base de datos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 