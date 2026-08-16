---
name: bruno-cli
description: Basics for running Bruno collections/folders with common CLI parameters and progressive disclosure references.
allowed-tools: Bash(bru:*)
---

# Bruno CLI Skill

Use this skill for quick Bruno run guidance. Start with collection/folder execution, then open deeper references as needed.

## Basics

```bash
bru run <collection_or_folder_path> --tests-only --bail
```

- Run full collection: `bru run <collection_path>`
- Run one folder: `bru run <collection_path>/<folder_name>`
- Preflight checks: `bru --version` and `bru run -h`
- Common params: `--env`, `--global-env`, `--env-file`, `--env-var key=value`
- Report params: `--reporter-json`, `--reporter-junit`, `--reporter-skip-body`

## Progressive disclosure

- **Collection layout and YAML basics** [references/collection-structure.md](references/collection-structure.md)
- **Env vars, auth, request types** [references/reporting-and-redaction.md](references/reporting-and-redaction.md)
- **Scripts, tests, runtime API** [references/scripting-and-tests.md](references/scripting-and-tests.md)
- **Best practices and run workflows** [references/run-patterns.md](references/run-patterns.md)
- **Use cases and common mistakes** [references/safety-model.md](references/safety-model.md)
