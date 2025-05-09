class TaskController {
    constructor() {
        this.tasks = [];
    }

    createTask(req, res) {
        const { title, description, dueDate } = req.body;
        const newTask = {
            id: this.tasks.length + 1,
            title,
            description,
            dueDate,
            status: 'pending',
            creationDate: new Date()
        };
        this.tasks.push(newTask);
        res.status(201).json(newTask);
    }

    getTasks(req, res) {
        res.status(200).json(this.tasks);
    }

    updateTask(req, res) {
        const { id } = req.params;
        const { title, description, dueDate, status } = req.body;
        const task = this.tasks.find(t => t.id === parseInt(id));

        if (!task) {
            return res.status(404).json({ message: 'Task not found' });
        }

        task.title = title || task.title;
        task.description = description || task.description;
        task.dueDate = dueDate || task.dueDate;
        task.status = status || task.status;

        res.status(200).json(task);
    }

    deleteTask(req, res) {
        const { id } = req.params;
        const taskIndex = this.tasks.findIndex(t => t.id === parseInt(id));

        if (taskIndex === -1) {
            return res.status(404).json({ message: 'Task not found' });
        }

        this.tasks.splice(taskIndex, 1);
        res.status(204).send();
    }
}

module.exports = new TaskController();