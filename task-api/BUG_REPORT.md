# BUG REPORT

Bugs found while writing tests for the Task Manager API.

---

## Bug 1: Pagination returns the wrong page (FIXED)

**Location:** `taskService.js`, `getPaginated()`

**Expected:** `GET /tasks?page=1&limit=10` returns the first 10 tasks.

**Actual:** It skipped the first 10 and returned tasks 11 and onwards.

**Why:** Offset was `page * limit` (gives 10 for page=1). It should be
`(page - 1) * limit`.

**How I found it:** Test created 15 tasks, requested page=1/limit=10,
expected "Task 1" in the results — it wasn't there.

**Fix:** Changed `page * limit` to `(page - 1) * limit`.

---

## Bug 2: `getByStatus` matches partial status strings

**Location:** `taskService.js`, `getByStatus()`

**Expected:** `?status=progress` returns only exact `"progress"` matches.

**Actual:** Uses `.includes()`, so `?status=progress` also matches
`"in_progress"` since it's a substring match, not an exact one.

**How I found it:** Filtered by a substring of an existing status and
got an unintended match.

**Fix would look like:** Change `.includes(status)` to `=== status`.

---

## Bug 3: `update()` allows overwriting `id` and `createdAt`

**Location:** `taskService.js`, `update()`; `validators.js`, `validateUpdateTask()`

**Expected:** `PUT /tasks/:id` only updates editable fields (title,
description, status, priority, dueDate).

**Actual:** `update()` merges the full request body with no field
restriction, so sending `id` or `createdAt` silently overwrites them.
If `id` changes, the task becomes unreachable at its original id.

**How I found it:** Sent `{ title: 'Changed', id: 'Changed-id' }` via
PUT, then fetched the task by its original id — got a 404 Not found Error.

**Fix would look like:** only `title`, `description`, `status`, `priority`, `dueDate` are allowed to be accepted, rest inputs will be ignored if passed.

---

## Bug 4: Completing a task resets its priority to "medium"

**Location:** `taskService.js`, `completeTask()`

**Expected:** Completing a task only changes `status` and `completedAt`.

**Actual:** It also hardcodes `priority: 'medium'`, so a `'high'`
priority task loses that priority once completed.

**How I found it:** Created a task with `priority: 'high'`, completed
it, and the returned priority was `'medium'` instead.

**Fix would look like:** Remove the `priority: 'medium'` line from the
update object in `completeTask()`.

---

## Bug 5: README and code disagree on status values

**Location:** `README.md` vs. `validators.js` (`VALID_STATUSES`)

**Expected:** Docs match what the code accepts.

**Actual:** README lists `pending | in-progress | completed`; code
actually uses `todo | in_progress | done`.

**How I found it:** Noticed the mismatch reading both files before
writing tests.

**Fix would look like:** Update the README section to
match the code's actual status values.

---

# Design Decisions: PATCH /tasks/:id/assign

**Empty `assignee` string:** Rejected with 400 Bad Request error. It is consistent with how
other fields (title, status, priority) are validated elsewhere in the
codebase.

**Re-assigning an already-assigned task:** Allowed — the new assignee
overwrites the old one. This mirrors a normal real-world case (a task
being handed off) and carries none of the risk that Bug 3 does, since
no other field is affected.
