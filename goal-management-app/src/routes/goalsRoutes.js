const express = require('express');
const router = express.Router();
const goalsController = require('../controllers/goalsController');

// Route to create a new goal
router.post('/', goalsController.createGoal);

// Route to get all goals
router.get('/', goalsController.getGoals);

// Route to update a goal by ID
router.put('/:id', goalsController.updateGoal);

// Route to delete a goal by ID
router.delete('/:id', goalsController.deleteGoal);

module.exports = router;