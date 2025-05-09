const request = require('supertest');
const app = require('../src/app');
const Routine = require('../src/models/routineModel');

describe('Routines API', () => {
    beforeEach(async () => {
        await Routine.deleteMany({});
    });

    it('should create a new routine', async () => {
        const routineData = {
            title: 'Morning Routine',
            description: 'Daily morning activities',
            frequency: 'daily',
            specificDays: [],
            scheduledTime: '08:00',
            status: 'active'
        };

        const response = await request(app)
            .post('/api/routines')
            .send(routineData)
            .expect(201);

        expect(response.body.title).toBe(routineData.title);
        expect(response.body.description).toBe(routineData.description);
    });

    it('should retrieve all routines', async () => {
        await Routine.create({
            title: 'Evening Routine',
            description: 'Evening activities',
            frequency: 'daily',
            specificDays: [],
            scheduledTime: '20:00',
            status: 'active'
        });

        const response = await request(app)
            .get('/api/routines')
            .expect(200);

        expect(response.body.length).toBe(1);
        expect(response.body[0].title).toBe('Evening Routine');
    });

    it('should update a routine', async () => {
        const routine = await Routine.create({
            title: 'Weekly Review',
            description: 'Review tasks and goals',
            frequency: 'weekly',
            specificDays: ['Monday'],
            scheduledTime: '18:00',
            status: 'active'
        });

        const updatedData = {
            title: 'Weekly Review Updated',
            description: 'Updated review tasks and goals',
            frequency: 'weekly',
            specificDays: ['Monday'],
            scheduledTime: '19:00',
            status: 'active'
        };

        const response = await request(app)
            .put(`/api/routines/${routine._id}`)
            .send(updatedData)
            .expect(200);

        expect(response.body.title).toBe(updatedData.title);
    });

    it('should delete a routine', async () => {
        const routine = await Routine.create({
            title: 'Delete Me',
            description: 'This routine will be deleted',
            frequency: 'weekly',
            specificDays: ['Friday'],
            scheduledTime: '17:00',
            status: 'active'
        });

        await request(app)
            .delete(`/api/routines/${routine._id}`)
            .expect(204);

        const response = await request(app)
            .get('/api/routines')
            .expect(200);

        expect(response.body.length).toBe(0);
    });
});