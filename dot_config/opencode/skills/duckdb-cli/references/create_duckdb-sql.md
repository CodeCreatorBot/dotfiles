# DuckDB SQL Dialect Reference

Companion reference for the `duckdb-cli` skill — read this when you need more
than the curated summary in `../SKILL.md`. DuckDB's dialect closely follows
PostgreSQL; this covers where it deliberately diverges, mirroring DuckDB's own
"SQL Dialect" doc section (`sql/dialect/`).

## Contents

- [PostgreSQL compatibility](#postgresql-compatibility)
- [Friendly SQL highlights](#friendly-sql-highlights)
- [Keywords, identifiers, and case sensitivity](#keywords-identifiers-and-case-sensitivity)
- [Order preservation](#order-preservation)
- [SQL quirks](#sql-quirks)
- [Indexing](#indexing)
- [Canonical docs](#canonical-docs)

## PostgreSQL compatibility

- **Division**: `1 / 2` is float division (`0.5`) in DuckDB, integer division
  (`0`) in PostgreSQL. Use `//` for integer division in DuckDB.
- **Division by zero**: DuckDB follows IEEE 754 (`1.0/0.0 = Infinity`,
  `0.0/0.0 = NaN`); PostgreSQL errors on division by zero.
- **`UNION` of mixed types**: DuckDB enforces a cast and completes (e.g.
  `SELECT true UNION SELECT 2` succeeds); PostgreSQL errors.
- **Implicit casting on `=`**: DuckDB casts strings/numbers/booleans more
  liberally than PostgreSQL (`'1.1' = 1` is `true` in DuckDB, an error in
  PostgreSQL). `'true' = 1` errors in both.
- **Quoted-identifier case sensitivity**: PostgreSQL preserves case _and_
  becomes case-sensitive once you quote an identifier. DuckDB stays fully
  case-insensitive for matching while still preserving the original case for
  display — quoting in DuckDB never makes matching case-sensitive. Toggle
  PostgreSQL-style lowercasing with `SET preserve_identifier_case = false;`.
- **`=` vs `==`**: DuckDB accepts both; PostgreSQL only accepts `=`. Prefer
  `=` for portability.
- **`VACUUM`**: in DuckDB it only rebuilds statistics; it does not reclaim
  space (unlike PostgreSQL's garbage collection).
- **Functions**: no `to_date` (use `strptime`); `regexp_extract` returns `''`
  instead of `NULL` on no match (`regexp_substr` in PostgreSQL returns `NULL`).
- **`GROUP BY` functional dependencies**: PostgreSQL can select a column that
  functionally depends on the `GROUP BY` key without aggregating it; DuckDB
  requires it in the `GROUP BY` list, an aggregate, or `GROUP BY ALL`.
- **POSIX regex operators**: avoid `~`/`~*`/`!~`/`!~*` in DuckDB — their
  behavior barely matches PostgreSQL's. Use `regexp_full_match`/
  `regexp_matches` instead.

Full page: <https://duckdb.org/docs/current/sql/dialect/postgresql_compatibility>

## Friendly SQL highlights

DuckDB's syntactic-sugar features ("friendly SQL"), the ones most likely to
come up writing ad-hoc queries:

- `CREATE OR REPLACE TABLE`, `CREATE TABLE ... AS SELECT` (CTAS).
- `INSERT INTO ... BY NAME`, `INSERT OR IGNORE/REPLACE INTO ...`.
- `DESCRIBE`, `SUMMARIZE` for quick schema/stat inspection.
- `FROM tbl` with no `SELECT` (implicit `SELECT *`).
- `GROUP BY ALL` / `ORDER BY ALL` — infer/shorthand instead of listing columns.
- `SELECT * EXCLUDE(col, ...)` / `SELECT * REPLACE(expr AS col, ...)`.
- `UNION BY NAME` — union by column name instead of position.
- `LIMIT 10%` — percentage-based limits.
- `PIVOT` / `UNPIVOT` for reshaping tables.
- Trailing commas allowed in column/table lists and list literals.
- Directly querying files: `FROM 'data.csv'`, `FROM 'data.parquet'`, glob
  patterns like `FROM 'part-*.parquet'`.
- Dot-operator function chaining: `SELECT ('hello').upper()`.
- `max(val, 3)` / `min(val, 3)` / `arg_max(...)` with an `n` argument for
  concise "top-N per group" queries, instead of a window-function subquery.

Full page: <https://duckdb.org/docs/current/sql/dialect/friendly_sql>

## Keywords, identifiers, and case sensitivity

- Unquoted identifiers can't be a reserved keyword, can't start with a digit/
  special character, and can't contain whitespace. Double-quote to use any of
  these (`"SELECT"`, `" my col "`); escape an embedded `"` by doubling it.
- Keywords and function names are always case-insensitive.
- Identifiers (quoted or not) are case-insensitive for matching (ASCII-based:
  `col_A` == `col_a`, but `col_á` != `col_a`), while the originally-typed case
  is preserved for display. Set `preserve_identifier_case = false` to force
  PostgreSQL-style lowercasing instead.
- `MAP` keys are case-sensitive; `STRUCT`/`UNION` keys are case-insensitive.
- Duplicate column names (e.g. from unnesting) are auto-deduped:
  `name`, `name_1`, `name_2`, ...
- Avoid naming a database `system` or `temp` (DuckDB's internal schema names)
  — alias on `ATTACH` if you must: `ATTACH 'temp.db' AS temp2;`.

Full page: <https://duckdb.org/docs/current/sql/dialect/keywords_and_identifiers>

## Order preservation

DuckDB preserves row order (like a dataframe library) for:
`SELECT`, `WHERE`, `LIMIT`/`OFFSET`, `FROM` with a single table, `UNION ALL`,
window functions with an empty `OVER()`, `COPY`, and CTEs/subqueries built
only from the above. `row_number() OVER ()` (or the `rowid` pseudo-column on
materialized tables) turns the original order into an explicit column.

Order is **not** guaranteed after: `JOIN`, `UNION`, `GROUP BY`, `ORDER BY`
(not a stable sort), `USING SAMPLE`, multi-table `FROM`, whole-table
aggregation input order, or scalar subqueries.

CSV/JSON/Parquet readers preserve file order by default too, controlled by
`SET preserve_insertion_order = false;` (default `true`).

Full page: <https://duckdb.org/docs/current/sql/dialect/order_preservation>

## SQL quirks

- Empty-group aggregates: `sum`/`list`/`string_agg` return `NULL` on an empty
  group (not `0`/`[]`/`''`) — standard SQL behavior.
- `-2^2` evaluates to `4.0`, not `-4` — unary minus binds tighter than `^`
  (PostgreSQL compatibility). Parenthesize: `-(2^2)`, or use `-pow(2, 2)`.
- `1 = true` and `1 = '1.1'` are both `true` in DuckDB — not PostgreSQL-
  compatible (see PostgreSQL Compatibility above).
- `1 IN (0, NULL)` is `NULL` (three-valued logic), but `1 IN [0, NULL]`
  (list literal) is `false`.
- `concat('abc', NULL) = 'abc'`, but `'abc' || NULL` is `NULL`.
- `'NaN'::FLOAT = 'NaN'::FLOAT` is `true` and `'NaN'::FLOAT > 3` is `true` —
  DuckDB gives floats a total order, unlike strict IEEE 754.
- Duplicate `SELECT` column names: the first occurrence shadows later ones.

Full page: <https://duckdb.org/docs/current/sql/dialect/sql_quirks>

## Indexing

1-based everywhere (`list[1]` is the first element), **except** JSON values,
which are 0-based (`json[1]` is the second element) — a deliberate exception
matching PostgreSQL's own JSON indexing.

Full page: <https://duckdb.org/docs/current/sql/dialect/indexing>

## Canonical docs

Section overview (this reference mirrors its structure):
<https://duckdb.org/docs/current/sql/dialect/overview>
