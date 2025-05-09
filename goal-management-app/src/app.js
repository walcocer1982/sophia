const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const goalsRoutes = require('./routes/goalsRoutes');
const tasksRoutes = require('./routes/tasksRoutes');
const routinesRoutes = require('./routes/routinesRoutes');
const dbConfig = require('./config/db');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

dbConfig();

app.use(express.json());

app.use('/api/goals', goalsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/routines', routinesRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});