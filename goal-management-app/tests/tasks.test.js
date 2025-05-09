const request = require('supertest');
const app = require('../src/app');
const Task = require('../src/models/taskModel');

describe('Tasks API', () => {
    beforeEach(async () => {
        await Task.deleteMany({});
    });

    it('should create a new task', async () => {
        const res = await request(app)
            .post('/api/tasks')
            .send({
                title: 'Test Task',
                description: 'This is a test task',
                priority: 'high',
                status: 'pending',
                dueDate: new Date(),
                goalId: '60d21b4667d0d8992e610c85' // Example goal ID
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('task');
        expect(res.body.task.title).toBe('Test Task');
    });

    it('should get all tasks', async () => {
        await Task.create({
            title: 'Test Task',
            description: 'This is a test task',
            priority: 'high',
            status: 'pending',
            dueDate: new Date(),
            goalId: '60d21b4667d0d8992e610c85'
        });

        const res = await request(app).get('/api/tasks');
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('tasks');
        expect(res.body.tasks.length).toBeGreaterThan(0);
    });

    it('should update a task', async () => {
        const task = await Task.create({
            title: 'Test Task',
            description: 'This is a test task',
            priority: 'high',
            status: 'pending',
            dueDate: new Date(),
            goalId: '60d21b4667d0d8992e610c85'
        });

        const res = await request(app)
            .put(`/api/tasks/${task._id}`)
            .send({
                title: 'Updated Task',
                status: 'completed'
            });
        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('task');
        expect(res.body.task.title).toBe('Updated Task');
    });

    it('should delete a task', async () => {
        const task = await Task.create({
            title: 'Test Task',
            description: 'This is a test task',
            priority: 'high',
            status: 'pending',
            dueDate: new Date(),
            goalId: '60d21b4667d0d8992e610c85'
        });

        const res = await request(app).delete(`/api/tasks/${task._id}`);
        expect(res.statusCode).toEqual(204);
    });
});