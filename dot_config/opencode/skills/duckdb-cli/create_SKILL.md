---
name: duckdb-cli
description: Drives the duckdb CLI non-interactively to run SQL against .duckdb/.db files (and CSV/Parquet via DuckDB's readers), inspect schema with dot commands, and get JSON/NDJSON output for parsing. Use when asked to query, verify, or answer questions from a DuckDB database, or when writing SQL in DuckDB's PostgreSQL-based dialect. Not for interactive-only features (autocomplete, editing, syntax highlighting), other DuckDB clients, or extensions.
allowed-tools: bash
---

# DuckDB CLI

Non-interactive use of the `duckdb` command line client: invocation, dot
commands, output formats, safe mode, query-completion ETA, and DuckDB's SQL
dialect. Anything else about the DuckDB CLI (autocomplete, line editing,
syntax highlighting, extensions, other client APIs) is out of scope here.

## Non-interactive invocation

Two supported shapes:

```bash
duckdb -readonly mydb.duckdb "SELECT * FROM foo LIMIT 5;"
duckdb -readonly mydb.duckdb < query.sql
```

- `duckdb <file> "<SQL>"` runs one statement and exits.
- `duckdb <file> < script.sql` feeds a whole script (SQL and/or dot commands)
  via stdin and exits when it's done.
- Flags are processed in order, and `-c`/`-s COMMAND` and `-cmd COMMAND` both
  accept a dot command or a SQL statement — chain several to set up mode/state
  before the real query, e.g. `-cmd ".mode jsonlines" -c "SELECT ...;"`.
- `~/.duckdbrc` loads automatically on every startup (custom prompts, aliases,
  etc.). For reproducible agent runs, start with `-init /dev/null` unless you
  specifically want the user's `.duckdbrc`.

## Read-only by default

Always pass `-readonly` unless the task explicitly asks for a write
(`CREATE`/`INSERT`/`UPDATE`/`DELETE`/`COPY ... TO`/writing `ATTACH`). If it
isn't explicit, treat the task as read-only and say so rather than guessing.

- `-readonly` is a startup flag, not a dot command — set it when you launch
  `duckdb`, not mid-session. It also supports attaching to remote databases
  over HTTPS.
- To intentionally write, just omit `-readonly` on that invocation. No other
  flag is needed.

## Output: JSON / NDJSON only

Two output modes matter for feeding results back to an agent:

```bash
duckdb -readonly -json mydb.duckdb "SELECT * FROM foo LIMIT 5;"
duckdb -readonly mydb.duckdb -cmd ".mode jsonlines" -c "SELECT * FROM foo;"
```

- `json` (`-json` startup flag or `.mode json`): one JSON array of row
  objects. Fine for small/medium result sets.
- `jsonlines` (NDJSON, one object per row): only settable via `.mode
jsonlines` — there's no `-jsonlines` startup flag. Better for large or
  streamed results since each line parses independently.
- Every other `.mode` (csv, markdown, box, insert, latex, ...) is out of
  scope for this skill.

## Query completion ETA

Long queries show a progress bar with a Kalman-filter-based time-to-completion
estimate. It can _increase_ as conditions change (memory pressure, I/O, skew)
— that's the filter adapting, not a stall. Don't interrupt a query just
because its ETA grew. If the progress output is noisy for automated/scripted
runs, disable it first: `SET enable_progress_bar = false;`.

## Dot commands

Meta-commands prefixed with `.`, one per line, space-separated arguments
(quote args containing spaces), no trailing semicolon. Non-interactively,
pass them via `-c`/`-cmd`, or as lines inside a script fed through stdin /
`.read`. Full command table and usage notes: [references/dot-commands.md](references/dot-commands.md).

## DuckDB's SQL dialect (curated)

DuckDB's dialect is PostgreSQL-based with a few differences that matter most
when writing ad-hoc queries:

- Integer `/` is float division in DuckDB (`1/2 = 0.5`); use `//` for integer
  division. `UNION` freely mixes boolean/integer/string types via implicit casts.
- Identifiers are always case-insensitive (even quoted ones) but their case is
  preserved — unlike PostgreSQL, where quoting makes identifiers case-sensitive.
- Trailing commas are allowed; `GROUP BY ALL` / `ORDER BY ALL`, `SELECT *
EXCLUDE(...)`/`REPLACE(...)`, and `FROM tbl` (no `SELECT`) all work.
- Row order is preserved by default for plain `SELECT`/`WHERE`/`LIMIT` on a
  single table (like a dataframe), but **not** guaranteed after `JOIN`,
  `UNION`, `GROUP BY`, or `ORDER BY` (non-stable sort).
- Indexing is 1-based everywhere except JSON values, which are 0-based.

Full breakdown (PostgreSQL compatibility, friendly-SQL feature list, keyword/
identifier rules, order preservation, quirks, indexing): [references/duckdb-sql.md](references/duckdb-sql.md).

## Workflow: answering questions / verifying a write against a database

Copy this checklist when you need to report the current state of a database,
including confirming that some other step's write actually landed:

- [ ] Confirm the exact `.duckdb`/`.db` file path (in-memory DBs vanish on exit).
- [ ] Query it read-only and non-interactively with structured output:
      `duckdb -readonly <file> -json "<verification SQL>;"`
- [ ] Prefer a targeted verification query over dumping a whole table:
  - existence/count: `SELECT count(*) FROM t WHERE ...;`
  - latest state: `SELECT * FROM t ORDER BY <ts_col> DESC LIMIT 1;`
  - schema sanity: `DESCRIBE t;` or `.schema t` (via `-c`)
- [ ] Never infer success from a prior command's exit code alone — re-query
      the row/table you expect changed and compare actual vs. expected.
- [ ] If the result isn't what you expect: double check the file path, check
      for a stray `<file>.wal` (an unfinished write can sit in the WAL until
      checkpoint/clean close), then re-run the write step and verify again.
- [ ] Only reopen without `-readonly` when the task explicitly asks for a
      write; stop once the verification query confirms the expected state.
