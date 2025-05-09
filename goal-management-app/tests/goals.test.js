const request = require('supertest');
const app = require('../src/app');
const Goal = require('../src/models/goalModel');

describe('Goals API', () => {
    beforeEach(async () => {
        await Goal.deleteMany({});
    });

    it('should create a new goal', async () => {
        const res = await request(app)
            .post('/api/goals')
            .send({
                title: 'Learn Node.js',
                description: 'Complete the Node.js course',
                type: 'monthly',
                status: 'pending',
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
            });
        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('_id');
        expect(res.body.title).toBe('Learn Node.js');
    });

    it('should get all goals', async () => {
        await Goal.create({
            title: 'Learn Node.js',
            description: 'Complete the Node.js course',
            type: 'monthly',
            status: 'pending'
        });
        const res = await request(app).get('/api/goals');
        expect(res.statusCode).toEqual(200);
        expect(res.body.length).toBeGreaterThan(0);
    });

    it('should update a goal', async () => {
        const goal = await Goal.create({
            title: 'Learn Node.js',
            description: 'Complete the Node.js course',
            type: 'monthly',
            status: 'pending'
        });
        const res = await request(app)
            .put(`/api/goals/${goal._id}`)
            .send({ status: 'completed' });
        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toBe('completed');
    });

    it('should delete a goal', async () => {
        const goal = await Goal.create({
            title: 'Learn Node.js',
            description: 'Complete the Node.js course',
            type: 'monthly',
            status: 'pending'
        });
        const res = await request(app).delete(`/api/goals/${goal._id}`);
        expect(res.statusCode).toEqual(204);
        const deletedGoal = await Goal.findById(goal._id);
        expect(deletedGoal).toBeNull();
    });
});