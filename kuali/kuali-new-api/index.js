require('dotenv').config();
const express = require('express');
const prisma = require('./prismaClient');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const cors = require('cors');
const swaggerDocument = YAML.load('./swagger.yaml');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// --- RUTAS PARA COMPANIES ---
app.get('/companies', async (req, res) => {
  try {
    const companies = await prisma.company.findMany();
    res.json(companies);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener companies' });
  }
});

app.post('/companies', async (req, res) => {
  const { name, sector } = req.body;
  try {
    const company = await prisma.company.create({ data: { name, sector } });
    res.status(201).json(company);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al crear company' });
  }
});

// --- RUTAS PARA LEADS ---
app.get('/leads', async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({ include: { company: true } });
    res.json(leads);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener leads' });
  }
});

app.post('/leads', async (req, res) => {
  const {
    firstName, lastName, email, phoneNumber,
    linkedinUrl, role, seniority, companyId
  } = req.body;

  try {
    const lead = await prisma.lead.create({
      data: {
        firstName,
        lastName,
        email,
        phoneNumber,
        linkedinUrl,
        role,
        seniority,
        company: { connect: { id: companyId } },
      },
    });
    res.status(201).json(lead);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al crear lead' });
  }
});

// --- RUTAS PARA TEMPLATES ---
app.get('/templates', async (req, res) => {
  try {
    const templates = await prisma.template.findMany();
    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener templates' });
  }
});

app.post('/templates', async (req, res) => {
  const { name, body } = req.body;
  try {
    const template = await prisma.template.create({ 
      data: { name, body } 
    });
    res.status(201).json(template);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al crear template' });
  }
});

// --- RUTAS PARA CONTACTS ---
app.get('/contacts', async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany();
    res.json(contacts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener contacts' });
  }
});

app.post('/contacts', async (req, res) => {
  const { name, phone, email, leadId } = req.body;
  try {
    const contact = await prisma.contact.create({
      data: {
        name,
        phone,
        email,
        lead: leadId ? { connect: { id: leadId } } : undefined
      }
    });
    res.status(201).json(contact);
  } catch (error) {
    console.error(error);
    res.status(400).json({ error: 'Error al crear contact' });
  }
});

// Arranque del servidor
app.listen(port, () => {
  console.log(`Servidor escuchando en http://localhost:${port}`);
});
