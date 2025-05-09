const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasksController');

// Create a new task
router.post('/', tasksController.createTask);

// Get all tasks
router.get('/', tasksController.getTasks);

// Update a task by ID
router.put('/:id', tasksController.updateTask);

// Delete a task by ID
router.delete('/:id', tasksController.deleteTask);

module.exports = router;