---
description: Orchestrate a TDD chain with tester, worker, reviewer, and optional refactor worker
argument-hint: "<task>"
---

# /tdd

Use the `subagent` tool and keep the foreground agent as a thin
supervisor only. Your job is to scope the request, spawn the right child
roles, call `wait()` when async or parallel work is still in flight and
you need the result in this turn, synthesize the outputs, and talk to
the user. Do not become an extra tester, worker, or reviewer unless the
workflow stalls and you explicitly decide to take over.

Run a red → green → refactor style workflow for:

$@

## Role boundaries

- `tester`: test-only writer. It may edit only test files and test-only
  helpers, fixtures, or snapshots. It must not modify production code.
- fresh `worker`: may change production code to make the new tests pass,
  but must not add or modify tests.
- fresh `reviewer`: review only. It must not update code.
- optional final fresh `worker`: may apply only concrete refactor notes
  from the reviewer and must not add tests.

## Mandatory tester gate

- The tester must start with a concise test plan before it writes
  anything.
- That plan must cover: target behavior or bug, relevant source files,
  target test files, scenarios or assertions, and the validation
  command.
- If the tester cannot produce that plan, or its handoff does not
  contain it, stop the workflow and fail the acceptance gate instead of
  continuing.
- Prefer an explicit tester acceptance gate such as `outputSchema` or
  another structured handoff check.
- If production-code changes are needed to make the tests pass, the
  tester should still write the best failing or characterization tests
  it can and clearly hand off that blocker to the worker.

## Default workflow

1. Run `tester` first, preferably in fresh context.
2. Run a fresh `worker` to make only the new tests pass with the
   smallest coherent production-code change.
3. Run a fresh `reviewer` to inspect the resulting diff, test quality,
   and refactor opportunities. The reviewer should gather codebase
   context and return concrete refactor notes, not code edits.
4. Only if the reviewer finds a clearly worthwhile refactor, run one
   final fresh `worker` that applies only those refactor notes while
   keeping tests green.

## Orchestration rules

- Prefer a native `subagent({ chain: [...] })` workflow with named
  outputs.
- Prefer `async: true`. If you still need the result in this turn and
  have no independent work left, call `wait()`; do not poll or end the
  turn just to wait.
- If you use any parallel reviewer or context fanout, keep one writer at
  a time and still use `wait()`.
- Keep prompts narrow and role-specific. Children must not launch
  subagents unless explicitly authorized.
- Use file-only outputs for large artifacts and named outputs such as
  `{outputs.testPlan}`, `{outputs.greenResult}`, and
  `{outputs.refactorNotes}` when helpful.
- If the reviewer says no worthwhile refactor is needed, stop after the
  review and summarize.

## Suggested chain shape

<!-- markdownlint-disable MD013 -->

```typescript
subagent({
  async: true,
  context: "fresh",
  chain: [
    {
      agent: "tester",
      as: "testPlan",
      task: "For the requested change, first create a concise test plan, then write or update only the necessary tests and test-only helpers. Do not modify production code. If you cannot produce the plan, stop and fail the handoff. Return the plan, changed test files, validation command, and whether the tests are intentionally red. Request: {task}",
    },
    {
      agent: "worker",
      as: "greenResult",
      task: "Using {outputs.testPlan}, make the new tests pass with the smallest correct production-code change. Do not add or modify tests.",
    },
    {
      agent: "reviewer",
      as: "refactorNotes",
      task: "Review the codebase context and the result from {outputs.greenResult}. Do not edit files. Return only concrete refactor notes that are worth doing now, or say plainly that no worthwhile refactor is needed.",
    },
  ],
});
```

<!-- markdownlint-enable MD013 -->

If step 3 returns real refactor notes, continue with one more fresh
`worker` pass:

<!-- markdownlint-disable MD013 -->

```typescript
subagent({
  agent: "worker",
  context: "fresh",
  task: "Apply only these refactor notes while keeping the new tests green: {outputs.refactorNotes}. Do not add tests.",
});
```

<!-- markdownlint-enable MD013 -->

## End summary

- tests added or updated
- production files changed
- validation run
- whether the workflow stopped at red, green, or refactor
- blockers, risks, or follow-up
