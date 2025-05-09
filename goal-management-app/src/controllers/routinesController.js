const Routine = require('../models/routineModel');

// Create a new routine
exports.createRoutine = async (req, res) => {
    try {
        const routine = new Routine(req.body);
        await routine.save();
        res.status(201).json(routine);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Get all routines
exports.getRoutines = async (req, res) => {
    try {
        const routines = await Routine.find();
        res.status(200).json(routines);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// Update a routine
exports.updateRoutine = async (req, res) => {
    try {
        const { id } = req.params;
        const routine = await Routine.findByIdAndUpdate(id, req.body, { new: true });
        if (!routine) {
            return res.status(404).json({ message: 'Routine not found' });
        }
        res.status(200).json(routine);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// Delete a routine
exports.deleteRoutine = async (req, res) => {
    try {
        const { id } = req.params;
        const routine = await Routine.findByIdAndDelete(id);
        if (!routine) {
            return res.status(404).json({ message: 'Routine not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};