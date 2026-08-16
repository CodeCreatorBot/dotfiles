---
name: azure-devops-cli
description: Azure DevOps discovery and controlled mutations via az CLI for Boards/work items, Repos/PRs, and PR discussions.
allowed-tools: Bash(az:*)
---

# Azure DevOps Skill

Use this skill for Azure DevOps workflows via `az` CLI. It supports both read and write operations with strict write safety.

## First step: grab ADO coordinates from repo docs

Before running Azure DevOps commands, read these files and extract default ADO coordinates:

- `AGENTS.md`
- `CONTRIBUTING.md` (if present; also check `CONTIRBUTING.md` if that variant exists)

Use discovered values as defaults for:

- `organization` (Azure DevOps org URL)
- `project`

If coordinates are missing or ambiguous, stop and ask the user for explicit values.

## Required inputs

- `operation_mode`: `read` or `write`
- `organization` and `project` (from repo docs above, unless user overrides)
- Operation selectors:
  - Read: `work_item_ids`, `wiql`, `repo`, `pr_id`, or related filters
  - Write: `operation` and operation-specific fields

## Preflight checks

Run these first:

```bash
az account show
az extension show --name azure-devops
az devops configure -l
```

Auth mode is `az login` only. If not authenticated, stop and request login.

## Read operations

Use read-only commands such as:

```bash
az boards query ...
az boards work-item show ...
az boards work-item relation list-type ...
az repos list ...
az repos show ...
az repos pr list ...
az repos pr show ...
az repos pr work-item list ...
az repos pr comment list ...
```

Never use write/delete commands when `operation_mode` is `read`.

## Write operations

Allowed mutation families include:

```bash
az boards work-item create ...
az boards work-item update ...
az boards work-item relation add ...
az boards work-item relation remove ...
az repos pr create ...
az repos pr update ...
az repos pr work-item add ...
az repos pr work-item remove ...
az repos pr comment add ...
az repos pr comment update ...
az repos pr set-vote ...
az repos pr reviewer add ...
az repos pr reviewer remove ...
```

Never run destructive delete commands.

Before any write, validate target existence with a read command.

## Mandatory preview + explicit confirmation

Before executing any write command, produce a one-screen preview that includes:

- target `organization` and `project`
- operation and target ids/entities
- exact command(s) to run
- concise change summary (current vs proposed)

Then require explicit user confirmation in the same session. If no confirmation, do not execute.

## Output format

Return concise structured output:

- `actions`: what was read or changed
- `items`: affected ids and URLs
- `warnings`: permissions, partial failures, skipped steps
- `next_step`: one practical follow-up
