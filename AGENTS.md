# AGENTS.md — chezmoi dotfiles

Dotfiles repo managed with [chezmoi](https://www.chezmoi.io/). The design is
one `env` toggle plus per-tool switches; everything else is mechanical.

## Model

- **Single source of truth:** `chezmoi.toml` `[data]` (`env` + desktop
  switches). It gates file deployment (`.chezmoiignore`) and package installs
  (`.chezmoiscripts/` re-render when a value changes → new checksum → the
  `run_once_` script re-runs).
- **`env`:** `dev` (everything on, no switches) · `work-dev` (dev + corporate
  / Windows tooling, OS-gated) · `desktop` (dev + desktop environment,
  switch-tuned).
- **The env model is load-bearing:** dev tooling has no switches; desktop-only
  files go behind `env = "desktop"` + a switch; work-only files behind
  `env = "work-dev"`. Extend it, don't rework it. (Exception: opencode
  agent/skill bundles are opt-in switches, default off.)

## Areas

- **`dot_config/`** → `~/.config/`: per-app config trees, each
  self-explanatory in its own dir. Shared mechanics (`.tmpl`, `create_`,
  gating): see `dot_config/AGENTS.md`.
- **`.chezmoiscripts/`** — package installers, documented below. A doc file
  can't live in that directory: chezmoi hard-errors on any file that isn't a
  `run_` script ("not a script", breaks `apply`), so this guidance sits here.

### Package installers (.chezmoiscripts/)

- One script per OS, prompting `[y/N]` with the full package list before
  installing. Scripts are **templates over data** — package lists are not
  hardcoded.
- **Naming:** `run_once_before_<nn>-<os>.sh.tmpl` = install before dotfiles
  (dev packages + toolchains); `run_once_after_<nn>-<os>.sh.tmpl` = after
  (desktop setup). `run_once_` re-runs only when the rendered content changes
  (toggling a switch → new checksum → re-run + re-prompt).
- **Data flow:** package lists in `.chezmoidata/packages.<os>.yaml` (desktop
  lists grouped by switch name); switch values in `chezmoi.toml` `[data]`.
- **Self-gate:** every script exits early unless it's on the right OS/env —
  chezmoi runs *all* scripts on every platform.
- **Retiring a script:** move it to `archive/` with the `run_` prefix
  stripped (chezmoi ignores it) and add the archive path to `.chezmoiignore`.

## Hard rules

- **No secrets in the repo.** Per-host secrets are untracked files, sourced
  if present (`~/.bashrc.d/secrets.sh`, `~/.config/powershell/secrets.ps1`).
  Never commit tokens, PATs, API keys, or corp credentials.
- **Never deploy repo-internal files** — `AGENTS.md`, `README.md`, `PLAN.md`,
  `archive/**` are chezmoiignored. Add any new doc file to `.chezmoiignore`
  too (target-path patterns, e.g. `.config/AGENTS.md`).
- **`create_`-prefixed files are host-specific:** rendered once at init, never
  overwritten (pi, opencode config); no provider/model/API keys in them.
  Shared opencode agents/skills are **managed** (sync on pull);
  retiring a `create_` file → add its target path to `.chezmoiremove`.
- Commits: conventional, focused, atomic (`feat:`/`fix:`/`docs:`/`chore:`).

## Conventions (compact)

`dot_x` → `~/.x` (dirs recurse: `dot_config/` → `~/.config/`) · `.tmpl` → Go
template · `run_once_*` → executable script · `archive/` holds retired scripts
with the `run_` prefix stripped so chezmoi ignores them.

## Verify before committing

```bash
chezmoi apply --dry-run --verbose        # what would change
chezmoi execute-template < file.tmpl     # render a template
chezmoi execute-template < s.sh.tmpl | bash -n   # shell syntax of a rendered script
uvx pre-commit run --all-files         # secrets, whitespace fixers, template render (see .pre-commit-config.yaml)
```

Isolated end-to-end test (never touches the real home):

```bash
rm -rf /tmp/cztest && mkdir -p /tmp/cztest/home /tmp/cztest/config/chezmoi /tmp/cztest/data
cp .chezmoi.toml.tmpl /tmp/cztest/config/chezmoi/chezmoi.toml.tmpl
HOME=/tmp/cztest/home XDG_CONFIG_HOME=/tmp/cztest/config XDG_DATA_HOME=/tmp/cztest/data \
  chezmoi init --source "$(chezmoi source-path)"
# edit /tmp/cztest/config/chezmoi/chezmoi.toml to change env, then:
HOME=/tmp/cztest/home XDG_CONFIG_HOME=/tmp/cztest/config XDG_DATA_HOME=/tmp/cztest/data \
  chezmoi apply --source "$(chezmoi source-path)" --dry-run --verbose
```

(`--source` points at the real source dir because the isolated config has no
`sourceDir` of its own — without it, `.chezmoidata` and `.chezmoiscripts`
aren't resolved and templates fail to render.)
