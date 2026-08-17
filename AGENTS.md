# AGENTS.md — chezmoi dotfiles

Dotfiles repo managed with [chezmoi](https://www.chezmoi.io/). One source of
truth: `chezmoi.toml` `[data]` — `env` + switches — which gates file deploy
(`.chezmoiignore`) and package installs (a changed value → new checksum →
`run_once_` scripts re-run and re-prompt).

- **env:** `dev` (all on) · `work-dev` (corporate/Windows, OS-gated) · `desktop` (switch-tuned).
- **Gating rule:** dev = no switches; desktop files = `env = "desktop"` + a switch; work files = `env = "work-dev"`. Extend, don't rework.

## Rules

- **No secrets.** Per-host secrets are untracked, sourced if present (`~/.bashrc.d/secrets.sh`, `~/.config/powershell/secrets.ps1`).
- **Never deploy repo-internal files** (`AGENTS.md`, `README.md`, `PLAN.md`, `archive/**`). New docs go in `.chezmoiignore` too.
- **`create_` = host-specific:** rendered once at init, never overwritten; retiring one → add its target path to `.chezmoiremove` (migration-only, inert on fresh hosts).
- **Commits:** conventional, focused, atomic.

## Scripts (`.chezmoiscripts/`)

- Templates over `.chezmoidata/packages.<os>.yaml` — never hardcode package lists. `before_` = dev/toolchains; `after_` = desktop.
- `run_once_` re-runs when rendered content changes (toggle a switch → new checksum → re-prompt).
- Self-gate: every script exits early unless on the right OS/env.
- **`calestia`** (desktop-shell composite): AUR `caelestia-cli` + `caelestia-shell`; owns `~/.config/hypr` via `caelestia install` (**hypr component only** — others clobber chezmoi files). chezmoi ships only `dot_config/caelestia/{hypr-vars,hypr-user}.lua` plus `dot_config/caelestia/templates/theme.ghostty` (a caelestia **user template** the CLI renders to `~/.local/state/caelestia/theme/theme.ghostty`, which the ghostty config's `theme` points at).
- Retire: move to `archive/`, strip `run_`, add path to `.chezmoiignore`.

## Conventions

`dot_x` → `~/.x` · `.tmpl` → Go template · `run_*` → script · `archive/` = retired (ignored).

## Verify before committing

```bash
chezmoi apply --dry-run --verbose            # what would change
chezmoi execute-template < f.tmpl | bash -n  # render + shell-syntax check
uvx pre-commit run --all-files               # secrets/fixers/template render
```
