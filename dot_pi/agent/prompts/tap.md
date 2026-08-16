---
description: Think and plan with optional researcher, scoped scout, planner, and oracle
argument-hint: "<problem statement>"
---

# /tap - Think and Plan

Use the `subagent` tool and keep the foreground agent as a thin
supervisor only. Your job is to decide whether external research is
needed, gather a lightweight codebase file map, hand that context to the
planner, let oracle pressure-test the plan, synthesize the outputs, and
talk to the user. Do not become the main researcher, scout, planner, or
oracle unless delegation fails.

## Default workflow

1. Decide whether the task needs external research. If it does, run
   `researcher` explicitly for web, docs, OSS code, or other external
   search only.
2. Run `scout` on the local codebase to find likely relevant folders and
   files and assemble a lightweight file map for the planner.
3. Hand the gathered context to `planner`. Keep the planning step as the
   main deliverable and require a `plan.md` output in the suggested
   chain.
4. Run `oracle` last. It should question the plan, make the corrections
   it is confident about, and return only the follow-up questions that
   still need a user answer.

## Role boundaries

- optional `researcher`: external research only. Use it only when the
  problem requires information outside the current repo.
- `scout`: local codebase only. It should focus on likely relevant
  files, folders, and filename-level hints where the problem statement
  or related behavior might show up.
- `planner`: write the plan only; no code changes.
- final `oracle`: critique the plan, apply only the corrections it is
  sure about, and surface any remaining user questions.

## Orchestration rules

- Prefer a native sequential `subagent({ chain: [...] })` workflow with
  named outputs. Keep the overall task non-async for this workflow.
- Make an explicit yes or no decision on whether `researcher` is
  needed. If you use it, its prompt must clearly say that it is doing
  external web, docs, or code search only.
- Treat `scout` as a weak default model. Keep its prompt narrow and do
  not ask it to do broad synthesis or heavy analysis.
- A scout should mostly use lightweight repo discovery such as `ls`,
  `ll`, `find`, `rg` and small bash navigation. Do not start by reading
  files.
- Constrain each scout to one or two large folders at most. If more of
  the repo must be covered, spawn parallel scouts with separate folder
  scopes instead of one broad scout.
- Scouts should return a practical file map: likely directories,
  candidate files, and short notes about why each group of paths may matter.
- The planner should produce a concrete plan with files, validation,
  dependencies, risks, assumptions, and an explicit `plan.md` output.
- The final oracle pass should pressure-test the plan, fix what is
  clearly wrong, and separate unresolved user questions from settled
  guidance.
- Unless the user explicitly asks otherwise, stop after the final plan.
  Do not implement.

## Suggested chain shape

<!-- markdownlint-disable MD013 -->

```typescript
subagent({
  chain: [
    {
      agent: "scout",
      as: "fileMap",
      task: "Scout the local codebase only. Stay within one or two likely relevant large folders. Do lightweight discovery only: prefer ls, ll, find, and minimal bash navigation. Do not start by reading files. Return a compact file map with the most relevant directories, candidate files, and why each one may matter for this problem.\n\nProblem: {task}",
    },
    {
      agent: "planner",
      as: "draftPlan",
      output: "plan.md",
      task: "Write a concrete implementation plan for this problem using the gathered context. Include likely files, validation, dependencies, risks, assumptions, and the proposed execution steps.\n\nProblem: {task}\n\nCodebase file map:\n{outputs.fileMap}",
    },
    {
      agent: "oracle",
      as: "finalPlanReview",
      task: "Question this plan, fix the parts you are sure about, and list only the user questions that still need an answer. Keep settled guidance separate from open questions.\n\nProblem: {task}\n\nDraft plan:\n{outputs.draftPlan}",
    },
  ],
});
```

<!-- markdownlint-enable MD013 -->

Add a researcher before the planner of you feel the tasks needs external searching.
Pipe the outputs of the researcher to the planner

## End summary

- whether external research was needed
- the scout file map and likely relevant paths
- the main implementation plan
- the oracle corrections
- only the remaining user questions, if any

## Execute on

Take this problem statement and turn it into a grounded implementation
plan following the above guidelines:

$@
