# duckdb-cli skill — source, not a managed dotfile

This directory is the source of truth for the `duckdb-cli` pi skill. It lives
under `.chezmoitemplates/` deliberately: chezmoi never applies anything in
`.chezmoitemplates/` to `~` on its own, so this skill stays out of pi's global
discovery (`~/.pi/agent/skills/`, `~/.agents/skills/`) and isn't observable in
every project. Enable it explicitly, per project, when you actually want it.

## Enable in one project

```bash
cp -r "$(chezmoi source-path)/.chezmoitemplates/skills/duckdb-cli" \
    /path/to/project/.pi/skills/duckdb-cli
```

## Enable globally instead (opt back into always-on)

```bash
cp -r "$(chezmoi source-path)/.chezmoitemplates/skills/duckdb-cli" \
    ~/.pi/agent/skills/duckdb-cli
```

## Refresh after editing the source here

Copies are independent snapshots — re-run the same `cp -r` (add `rm -rf` on
the destination first, or use `cp -rf`) in every project/global location
where it's already deployed, after changing `SKILL.md` or `references/` here.
