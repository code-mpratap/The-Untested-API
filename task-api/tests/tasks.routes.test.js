const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');

describe('Task routes', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('POST /tasks', () => {
    test('happy path: creates a task and returns 201', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Buy milk' });

      expect(res.status).toBe(201);
      expect(res.body.title).toBe('Buy milk');
      expect(res.body.id).toBeDefined();
    });

    test('edge case: missing title returns 400', async () => {
      const res = await request(app).post('/tasks').send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/title/i);
    });

    test('edge case: invalid status returns 400', async () => {
      const res = await request(app)
        .post('/tasks')
        .send({ title: 'Bad status', status: 'not-a-status' });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/status/i);
    });
  });

  describe('GET /tasks', () => {
    test('happy path: returns all tasks', async () => {
      await request(app).post('/tasks').send({ title: 'A' });
      await request(app).post('/tasks').send({ title: 'B' });

      const res = await request(app).get('/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('edge case: returns empty array when no tasks exist', async () => {
      const res = await request(app).get('/tasks');

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    test('edge case: filters by status query param', async () => {
      await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'B', status: 'done' });

      const res = await request(app).get('/tasks?status=done');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].title).toBe('B');
    });
  });

  describe('GET /tasks/stats', () => {
    test('happy path: returns counts and overdue', async () => {
      await request(app).post('/tasks').send({ title: 'A', status: 'todo' });
      await request(app).post('/tasks').send({ title: 'B', status: 'done' });

      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body.todo).toBe(1);
      expect(res.body.done).toBe(1);
      expect(res.body).toHaveProperty('overdue');
    });

    test('edge case: stats on empty task list are all zero', async () => {
      const res = await request(app).get('/tasks/stats');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });
  });

  describe('PUT /tasks/:id', () => {
    test('happy path: updates an existing task', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Old' });
      const id = createRes.body.id;

      const res = await request(app).put(`/tasks/${id}`).send({ title: 'New' });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('New');
    });

    test('edge case: unknown id returns 404', async () => {
      const res = await request(app).put('/tasks/unknown-id').send({ title: 'X' });

      expect(res.status).toBe(404);
    });

    test('edge case: invalid priority returns 400 and leaves task unchanged', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const res = await request(app)
        .put(`/tasks/${id}`)
        .send({ priority: 'urgent' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /tasks/:id', () => {
    test('happy path: deletes an existing task and returns 204', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'To delete' });
      const id = createRes.body.id;

      const res = await request(app).delete(`/tasks/${id}`);
      expect(res.status).toBe(204);

      const getRes = await request(app).get('/tasks');
      expect(getRes.body).toHaveLength(0);
    });

    test('edge case: unknown id returns 404', async () => {
      const res = await request(app).delete('/tasks/unknown-id');
      expect(res.status).toBe(404);
    });

    test('edge case: deleting the same task twice returns 404 on the second call', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Once' });
      const id = createRes.body.id;

      await request(app).delete(`/tasks/${id}`);
      const secondRes = await request(app).delete(`/tasks/${id}`);

      expect(secondRes.status).toBe(404);
    });
  });

  // Test for the new Feature
  describe('PATCH /tasks/:id/complete', () => {
    test('happy path: marks task as done', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Finish' });
      const id = createRes.body.id;

      const res = await request(app).patch(`/tasks/${id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
      expect(res.body.completedAt).not.toBeNull();
    });

    test('edge case: unknown id returns 404', async () => {
      const res = await request(app).patch('/tasks/unknown-id/complete');
      expect(res.status).toBe(404);
    });

    test('edge case: completing an already-completed task keeps it done', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Finish twice' });
      const id = createRes.body.id;

      await request(app).patch(`/tasks/${id}/complete`);
      const res = await request(app).patch(`/tasks/${id}/complete`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('done');
    });
  });
});
