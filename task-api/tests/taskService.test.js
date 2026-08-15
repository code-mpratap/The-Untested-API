const taskService = require('../src/services/taskService');

describe('taskService', () => {
  beforeEach(() => {
    taskService._reset();
  });

  describe('create', () => {
    test('happy path: creates a task with defaults filled in', () => {
      const task = taskService.create({ title: 'Buy milk' });

      expect(task.id).toBeDefined();
      expect(task.title).toBe('Buy milk');
      expect(task.status).toBe('todo');
      expect(task.priority).toBe('medium');
      expect(task.completedAt).toBeNull();
      expect(task.createdAt).toBeDefined();
    });

    test('edge case: respects explicitly provided status/priority/dueDate', () => {
      const task = taskService.create({
        title: 'Ship feature',
        status: 'in_progress',
        priority: 'high',
        dueDate: '2026-12-01T00:00:00.000Z',
      });

      expect(task.status).toBe('in_progress');
      expect(task.priority).toBe('high');
      expect(task.dueDate).toBe('2026-12-01T00:00:00.000Z');
    });

    test('edge case: two tasks get different ids', () => {
      const t1 = taskService.create({ title: 'A' });
      const t2 = taskService.create({ title: 'B' });
      expect(t1.id).not.toBe(t2.id);
    });
  });

  describe('findById / getAll', () => {
    test('happy path: findById returns the correct task', () => {
      const created = taskService.create({ title: 'Find me' });
      const found = taskService.findById(created.id);
      expect(found).toEqual(created);
    });

    test('edge case: findById returns undefined for unknown id', () => {
      expect(taskService.findById('does-not-exist')).toBeUndefined();
    });

    test('edge case: getAll returns empty array when no tasks exist', () => {
      expect(taskService.getAll()).toEqual([]);
    });
  });

  describe('getByStatus', () => {
    test('happy path: returns only tasks with exact matching status', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'done' });

      const result = taskService.getByStatus('done');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('B');
    });

    test('BUG: substring match incorrectly matches partial status strings', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'in_progress' });

      // "progress" is a substring of "in_progress" - current implementation
      // uses .includes() instead of strict equality, so this incorrectly matches.
      const result = taskService.getByStatus('progress');
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('in_progress');
    });

    test('edge case: unknown status returns empty array', () => {
      taskService.create({ title: 'A', status: 'todo' });
      expect(taskService.getByStatus('archived')).toEqual([]);
    });
  });

  describe('getPaginated', () => {
    beforeEach(() => {
      for (let i = 1; i <= 15; i++) {
        taskService.create({ title: `Task ${i}` });
      }
    });

    test('BUG: page=1 should return the first `limit` tasks, but currently skips them', () => {
      const result = taskService.getPaginated(1, 10);
      // Expected: first 10 tasks (Task 1..Task 10)
      // Actual (bug): offset = page * limit = 10, so it skips the first 10
      // and returns Task 11..Task 15 instead.
      expect(result).toHaveLength(10);
      expect(result[0].title).toBe('Task 1');
    });

    test('edge case: page beyond available data returns empty array', () => {
      const result = taskService.getPaginated(10, 10);
      expect(result).toEqual([]);
    });
  });

  describe('getStats', () => {
    test('happy path: counts tasks per status', () => {
      taskService.create({ title: 'A', status: 'todo' });
      taskService.create({ title: 'B', status: 'todo' });
      taskService.create({ title: 'C', status: 'done' });

      const stats = taskService.getStats();
      expect(stats.todo).toBe(2);
      expect(stats.done).toBe(1);
      expect(stats.in_progress).toBe(0);
    });

    test('edge case: counts overdue tasks that are not done', () => {
      taskService.create({
        title: 'Overdue',
        status: 'todo',
        dueDate: '2020-01-01T00:00:00.000Z',
      });
      taskService.create({
        title: 'Overdue but done',
        status: 'done',
        dueDate: '2020-01-01T00:00:00.000Z',
      });

      const stats = taskService.getStats();
      expect(stats.overdue).toBe(1);
    });

    test('edge case: empty task list returns all zero counts', () => {
      const stats = taskService.getStats();
      expect(stats).toEqual({ todo: 0, in_progress: 0, done: 0, overdue: 0 });
    });
  });

  describe('update', () => {
    test('happy path: updates provided fields only', () => {
      const created = taskService.create({ title: 'Old title', priority: 'low' });
      const updated = taskService.update(created.id, { title: 'New title' });

      expect(updated.title).toBe('New title');
      expect(updated.priority).toBe('low');
    });

    test('edge case: returns null for unknown id', () => {
      expect(taskService.update('unknown-id', { title: 'X' })).toBeNull();
    });

    test('BUG: allows overwriting immutable fields like id and createdAt', () => {
      const created = taskService.create({ title: 'Original' });
      const originalCreatedAt = created.createdAt;

      const updated = taskService.update(created.id, {
        title: 'Changed',
        id: 'hijacked-id',
        createdAt: '1999-01-01T00:00:00.000Z',
      });

      // Current (buggy) behavior: id and createdAt get silently overwritten.
      // This test documents the bug - once fixed, these expectations should
      // change to assert the id/createdAt stayed the same.
      expect(updated.id).toBe('hijacked-id');
      expect(updated.createdAt).not.toBe(originalCreatedAt);

      // Consequence: the task is no longer findable by its original id.
      expect(taskService.findById(created.id)).toBeUndefined();
    });
  });

  describe('remove', () => {
    test('happy path: removes an existing task', () => {
      const created = taskService.create({ title: 'To delete' });
      const result = taskService.remove(created.id);

      expect(result).toBe(true);
      expect(taskService.findById(created.id)).toBeUndefined();
    });

    test('edge case: returns false for unknown id', () => {
      expect(taskService.remove('unknown-id')).toBe(false);
    });
  });

  describe('completeTask', () => {
    test('happy path: marks a task done and sets completedAt', () => {
      const created = taskService.create({ title: 'Finish me', status: 'in_progress' });
      const completed = taskService.completeTask(created.id);

      expect(completed.status).toBe('done');
      expect(completed.completedAt).not.toBeNull();
    });

    test('edge case: returns null for unknown id', () => {
      expect(taskService.completeTask('unknown-id')).toBeNull();
    });

    test('BUG: resets priority to medium regardless of original priority', () => {
      const created = taskService.create({ title: 'High priority task', priority: 'high' });
      const completed = taskService.completeTask(created.id);

      // Current (buggy) behavior: priority is forced to 'medium' on completion.
      // Once fixed, this should assert completed.priority === 'high'.
      expect(completed.priority).toBe('medium');
    });
  });
});
