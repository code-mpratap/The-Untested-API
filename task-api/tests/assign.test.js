//Testing of the new API Feature PATCH /tasks/:id/assign

const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('PATCH /tasks/:id/assign', () => {
  beforeEach(() => {
    taskService._reset();
  });

  test('happy path: assigns a task to a user and returns the updated task', async () => {
    const createRes = await request(app).post('/tasks').send({ title: 'Fix bug' });
    const id = createRes.body.id;

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 'Priya' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Priya');
    expect(res.body.id).toBe(id);
  });

  test('edge case: unknown task id returns 404', async () => {
    const res = await request(app)
      .patch('/tasks/unknown-id/assign')
      .send({ assignee: 'Priya' });

    expect(res.status).toBe(404);
  });

  test('edge case: empty assignee string returns 400', async () => {
    const createRes = await request(app).post('/tasks').send({ title: 'Fix bug' });
    const id = createRes.body.id;

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: '' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/assignee/i);
  });

  test('edge case: missing assignee field returns 400', async () => {
    const createRes = await request(app).post('/tasks').send({ title: 'Fix bug' });
    const id = createRes.body.id;

    const res = await request(app).patch(`/tasks/${id}/assign`).send({});

    expect(res.status).toBe(400);
  });

  test('edge case: non-string assignee returns 400', async () => {
    const createRes = await request(app).post('/tasks').send({ title: 'Fix bug' });
    const id = createRes.body.id;

    const res = await request(app)
      .patch(`/tasks/${id}/assign`)
      .send({ assignee: 123 });

    expect(res.status).toBe(400);
  });

  test('design decision: re-assigning an already-assigned task overwrites the previous assignee', async () => {
    const createRes = await request(app).post('/tasks').send({ title: 'Fix bug' });
    const id = createRes.body.id;

    await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Priya' });
    const res = await request(app).patch(`/tasks/${id}/assign`).send({ assignee: 'Amit' });

    expect(res.status).toBe(200);
    expect(res.body.assignee).toBe('Amit');
  });
});
