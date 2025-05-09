import express from 'express';
import TaskController from '../controllers/taskController.js';

const router = express.Router();
const taskController = new TaskController();

const setRoutes = (app) => {
    router.post('/tasks', taskController.createTask);
    router.get('/tasks', taskController.getTasks);
    router.put('/tasks/:id', taskController.updateTask);
    router.delete('/tasks/:id', taskController.deleteTask);

    app.use('/api', router);
};

export default setRoutes;