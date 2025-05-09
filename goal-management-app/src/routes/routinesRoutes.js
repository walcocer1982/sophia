const express = require('express');
const router = express.Router();
const routinesController = require('../controllers/routinesController');

// Create a new routine
router.post('/', routinesController.createRoutine);

// Get all routines
router.get('/', routinesController.getRoutines);

// Update a routine by ID
router.put('/:id', routinesController.updateRoutine);

// Delete a routine by ID
router.delete('/:id', routinesController.deleteRoutine);

module.exports = router;