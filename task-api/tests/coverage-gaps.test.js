const request = require('supertest');
const app = require('../src/app');
const taskService = require('../src/services/taskService');
const { validateCreateTask, validateUpdateTask } = require('../src/utils/validators');

describe('Coverage gap-fill tests', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('validateCreateTask - remaining branches', () => {
    test('invalid dueDate returns error', () => {
      const error = validateCreateTask({ title: 'Task', dueDate: 'not-a-date' });
      expect(error).toMatch(/dueDate/i);
    });

    test('valid dueDate passes (returns null)', () => {
      const error = validateCreateTask({
        title: 'Task',
        dueDate: '2026-12-01T00:00:00.000Z',
      });
      expect(error).toBeNull();
    });

    test('invalid priority returns error', () => {
      const error = validateCreateTask({ title: 'Task', priority: 'urgent' });
      expect(error).toMatch(/priority/i);
    });

    test('title with only whitespace returns error', () => {
      const error = validateCreateTask({ title: '   ' });
      expect(error).toMatch(/title/i);
    });
  });

  describe('validateUpdateTask - remaining branches', () => {
    test('invalid dueDate returns error', () => {
      const error = validateUpdateTask({ dueDate: 'not-a-date' });
      expect(error).toMatch(/dueDate/i);
    });

    test('valid dueDate passes (returns null)', () => {
      const error = validateUpdateTask({ dueDate: '2026-12-01T00:00:00.000Z' });
      expect(error).toBeNull();
    });

    test('invalid priority returns error', () => {
      const error = validateUpdateTask({ priority: 'urgent' });
      expect(error).toMatch(/priority/i);
    });

    test('invalid status returns error', () => {
      const error = validateUpdateTask({ status: 'archived' });
      expect(error).toMatch(/status/i);
    });

    test('empty body is valid (no fields to update)', () => {
      const error = validateUpdateTask({});
      expect(error).toBeNull();
    });

    test('title with only whitespace returns error', () => {
      const error = validateUpdateTask({ title: '   ' });
      expect(error).toMatch(/title/i);
    });
  });

  describe('GET /tasks - pagination route branch', () => {
    test('page and limit query params return paginated results', async () => {
      for (let i = 1; i <= 5; i++) {
        await request(app).post('/tasks').send({ title: `Task ${i}` });
      }

      const res = await request(app).get('/tasks?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });

    test('non-numeric page/limit falls back to defaults instead of erroring', async () => {
      await request(app).post('/tasks').send({ title: 'Task 1' });

      const res = await request(app).get('/tasks?page=abc&limit=xyz');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('PUT /tasks/:id - remaining validation branches', () => {
    test('invalid dueDate on update returns 400', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const res = await request(app)
        .put(`/tasks/${id}`)
        .send({ dueDate: 'not-a-date' });

      expect(res.status).toBe(400);
    });

    test('invalid status on update returns 400', async () => {
      const createRes = await request(app).post('/tasks').send({ title: 'Task' });
      const id = createRes.body.id;

      const res = await request(app)
        .put(`/tasks/${id}`)
        .send({ status: 'archived' });

      expect(res.status).toBe(400);
    });
  });
});