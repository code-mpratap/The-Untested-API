# Submission Notes

## What I'd test next if I had more time

Concurrency — what happens if two requests update or delete the same task
at nearly the same time, since the in-memory array has no protection
against race conditions.

## What surprised me in the codebase

`completeTask()` silently resets a task's `priority` back to `'medium'`
even if it was `'high'` — it looks like a copy-paste mistake rather than
an intentional choice.

## Questions I'd ask before shipping this to production

Is the in-memory data store (which resets on every restart) intentional
for this stage, or is a real, persistent database expected before this
goes live?
