const mongoose = require('mongoose');

const routineSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    frequency: {
        type: String,
        enum: ['diaria', 'semanal', 'mensual'],
        required: true
    },
    specificDays: {
        type: [String],
        enum: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']
    },
    scheduledTime: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['completada', 'inactiva'],
        default: 'inactiva'
    }
});

module.exports = mongoose.model('Routine', routineSchema);