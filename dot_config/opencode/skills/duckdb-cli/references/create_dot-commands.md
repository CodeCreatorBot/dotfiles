# Dot Commands Reference

Companion reference for the `duckdb-cli` skill — read this when you need the
exact name/syntax of a dot command. See `../SKILL.md` for when to use this
skill at all.

## Contents

- [Full command list](#full-command-list)
- [Using them non-interactively](#using-them-non-interactively)
- [Output & redirection: `.mode`, `.output`, `.once`](#output--redirection-mode-output-once)
- [Reading a script: `.read` / stdin](#reading-a-script-read--stdin)
- [Inspecting schema: `.tables`, `.schema`, `.indexes`, `.dump`](#inspecting-schema-tables-schema-indexes-dump)
- [Importing data: `.import`](#importing-data-import)
- [Safe mode: `.safe_mode`](#safe-mode-safe_mode)
- [Shorthands](#shorthands)
- [Canonical docs](#canonical-docs)

## Full command list

| Command                                  | Description                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------- |
| `.bail on/off`                           | Stop after hitting an error. Default: `off`                                   |
| `.binary on/off`                         | Turn binary output `on`/`off`. Default: `off`                                 |
| `.cd DIRECTORY`                          | Change the working directory to `DIRECTORY`                                   |
| `.changes on/off`                        | Show number of rows changed by SQL                                            |
| `.columns`                               | Column-wise rendering of query results                                        |
| `.constant COLOR`                        | Syntax-highlight color for constant values                                    |
| `.constantcode CODE`                     | Syntax-highlight terminal code for constant values                            |
| `.databases`                             | List names and files of attached databases                                    |
| `.dump TABLE`                            | Render database content as SQL. `TABLE` is a `LIKE` pattern                   |
| `.echo on/off`                           | Turn command echo `on`/`off`                                                  |
| `.exit CODE`                             | Exit with return-code `CODE`                                                  |
| `.headers on/off`                        | Turn display of headers `on`/`off` (not in duckbox mode)                      |
| `.help -all PATTERN`                     | Show help text for `PATTERN`; `.help shortcuts` for keybinds                  |
| `.highlight on/off`                      | Toggle SQL syntax highlighting                                                |
| `.highlight_colors COMPONENT COLOR`      | Configure result-table highlight colors (duckbox only)                        |
| `.highlight_mode mixed/dark/light`       | Toggle highlight mode                                                         |
| `.highlight_results on/off`              | Toggle result-table highlighting (duckbox only)                               |
| `.import FILE TABLE`                     | Import `FILE` into `TABLE`. Supports `--csv`/`--json`/`--parquet`             |
| `.indexes TABLE`                         | Show index names                                                              |
| `.keyword COLOR`                         | Syntax-highlight color for keywords                                           |
| `.keywordcode CODE`                      | Syntax-highlight terminal code for keywords                                   |
| `.large_number_rendering all/footer/off` | Human-readable large numbers (duckbox only, default `footer`)                 |
| `.last`                                  | Render the last result without truncating                                     |
| `.log FILE/off`                          | Turn logging on/off; `FILE` can be `stderr`/`stdout`                          |
| `.maxrows COUNT`                         | Max rows for display (duckbox mode only)                                      |
| `.maxwidth COUNT`                        | Max width in chars; `0` = terminal width (duckbox mode only)                  |
| `.mode MODE TABLE`                       | Set output mode                                                               |
| `.multiline`                             | Multi-line input mode (default)                                               |
| `.nullvalue STRING`                      | String shown for `NULL`. Default: `NULL`                                      |
| `.once OPTIONS FILE`                     | Send only the next result to `FILE`                                           |
| `.open OPTIONS FILE`                     | Close current db, reopen `FILE`. Options: `--new --nofollow --readonly --sql` |
| `.output FILE`                           | Send all subsequent output to `FILE` (omit `FILE` to revert to stdout)        |
| `.pager OPTIONS`                         | Control pager usage for output                                                |
| `.print STRING...`                       | Print a literal string                                                        |
| `.progress_bar COMPONENT`                | Configure progress bar component styles                                       |
| `.prompt OPTIONS CONTINUE`               | Replace the standard prompts                                                  |
| `.quit`                                  | Exit                                                                          |
| `.read FILE`                             | Read input (SQL and/or dot commands) from `FILE`                              |
| `.rows`                                  | Row-wise rendering (default)                                                  |
| `.safe_mode`                             | Activate safe mode (see below; irreversible for the session)                  |
| `.schema PATTERN`                        | Show `CREATE` statements matching `PATTERN`                                   |
| `.separator COL ROW`                     | Change column/row separators                                                  |
| `.shell CMD ARGS...`                     | Run `CMD` in a system shell                                                   |
| `.show`                                  | Show current values of CLI settings                                           |
| `.singleline`                            | Single-line input mode                                                        |
| `.startup_text none/version/all`         | Controls CLI start-up banner text                                             |
| `.system CMD ARGS...`                    | Run `CMD` in a system shell (alias of `.shell`)                               |
| `.tables TABLE`                          | List tables matching `LIKE` pattern `TABLE`, with columns/types/row counts    |
| `.timer on/off`                          | Turn the SQL timer on/off                                                     |
| `.width NUM1 NUM2 ...`                   | Minimum column widths for columnar output                                     |

## Using them non-interactively

Dot commands must be a single line, no leading whitespace, no trailing
semicolon. To use one outside an interactive session:

```bash
duckdb mydb.duckdb -c ".tables"
duckdb mydb.duckdb -cmd ".mode jsonlines" -c "SELECT * FROM t;"
```

Or put them as lines in a script and feed it via stdin/`.read` — dot commands
and SQL statements can be freely mixed in the same script.

## Output & redirection: `.mode`, `.output`, `.once`

- `.mode MODE` changes the rendering (`json`, `jsonlines`, `csv`, `markdown`,
  `duckbox`, ...). Changing `.mode csv`/`.mode tabs` also resets `.separator`.
- `.output FILE` redirects _all_ subsequent results to `FILE`, overwriting it
  each time; `.output` with no argument reverts to stdout.
- `.once FILE` redirects only the _next_ result, then reverts automatically.
  `.once -e` opens the result in the default text editor; `.once -x`
  (equivalent to `.excel`) opens it as a spreadsheet.

```bash
.mode jsonlines
.output results.ndjson
SELECT * FROM t;
.output
```

## Reading a script: `.read` / stdin

`.read FILE` runs the SQL/dot commands in `FILE`, then returns control to the
caller. This is the interactive-session equivalent of `duckdb <db> < FILE`
from the shell. Output still obeys whatever `.mode`/`.output` is active.

## Inspecting schema: `.tables`, `.schema`, `.indexes`, `.dump`

- `.tables [PATTERN]` — list tables (optionally filtered by a `LIKE` pattern,
  e.g. `.tables %log%`).
- `.schema [PATTERN]` — show the `CREATE` statements for matching objects.
- `.indexes [TABLE]` — list index names.
- `.dump [PATTERN...]` — render full database content (schema + data) as SQL;
  useful for backups/migration snapshots. `--newlines` allows unescaped
  newlines in the dumped output.

## Importing data: `.import`

```bash
.import data.csv my_table
.import data.csv my_table --delimiter "|" --header false
.import data.json my_table --json
```

Uses `read_csv`/`read_json`/`read_parquet` under the hood with schema
auto-detection; creates the target table if it doesn't exist. Format is
inferred from the file extension unless `--csv`/`--json`/`--parquet` is given.
Reader-specific options pass through as `--option value`. Disabled entirely
under safe mode.

## Shorthands

An unambiguous prefix of a dot command or its argument silently autocompletes,
e.g. `.mo ma` == `.mode markdown`. Avoid shorthands in saved scripts —
they're harder to read and not guaranteed stable across versions.

## Canonical docs

Full detail and any dot command not covered above:
<https://duckdb.org/docs/current/clients/cli/dot_commands>
