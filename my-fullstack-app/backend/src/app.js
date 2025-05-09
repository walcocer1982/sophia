const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const dniRoutes = require('./routes/dniRoutes');

app.use(cors()); // Habilitar CORS
app.use(express.json());
app.use('/api/dni', dniRoutes);

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../../frontend/src')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/src', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
