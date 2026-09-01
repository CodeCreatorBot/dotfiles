# AGENTS.md — chezmoi dotfiles

Dotfiles repo managed with [chezmoi](https://www.chezmoi.io/). One source of
truth: `chezmoi.toml` `[data]` — `env` + switches — which gates file deploy
(`.chezmoiignore`) and package installs (a changed value → new checksum →
`run_once_` scripts re-run and re-prompt).

- **env:** `dev` (all on) · `work-dev` (corporate/Windows, OS-gated) · `desktop` (switch-tuned).
- **Gating rule:** dev = no switches; desktop files = `env = "desktop"` + a switch; work files = `env = "work-dev"`. Extend, don't rework.

## Package data (`.chezmoidata/packages.*.yaml`)

- **Shape — `os.env.[flag].installer = [packages]`:** top-level key is the OS
  (`arch`, `fedora`, `ubuntu`, `windows`, `toolchains`), second the env
  (`dev`, `work-dev`, `desktop`), then an **optional** flag/switch name, then
  the installer → package list (`pacman`, `aur`, `apt`, `dnf`, `copr`,
  `winget`, `curlInstallers`, `voltaTools`; side-effect keys `services`/
  `groups`; installer `flatpak`). This shape holds in every packages file.
- **Flag optional = always-on:** base packages sit directly under the env
  (`arch.dev.pacman`, `windows.work-dev.winget`) — installed for every env on
  that OS. Switch-gated desktop groups nest one level deeper
  (`arch.desktop.<flag>.pacman`).
- **Applications are flags:** every optional desktop app/stack (caelestia,
  docker, onedrive, fprint, ai, stremio, audiobooks, bitwarden, grayjay,
  nordvpn, …) gets its own switch — default OFF in `chezmoi.toml [data]`,
  opt-in by flipping. Package-only flags need no `.chezmoiignore` entries
  (no files to gate). Adding one = YAML group + `chezmoi.toml` switch, done —
  `run_once_after_20-arch-desktop` walks `arch.desktop` flags generically
  (no per-flag script edits).

## Rules

- **No secrets.** Per-host secrets are untracked, sourced if present (`~/.bashrc.d/secrets.sh`, `~/.config/powershell/secrets.ps1`).
- **Never deploy repo-internal files** (`AGENTS.md`, `README.md`, `PLAN.md`, `archive/**`). New docs go in `.chezmoiignore` too.
- **`create_` = host-specific:** rendered once at init, never overwritten; retiring one → add its target path to `.chezmoiremove` (migration-only, inert on fresh hosts).
- **Commits:** conventional, focused, atomic.

## Scripts (`.chezmoiscripts/`)

- Templates over `.chezmoidata/packages.<os>.yaml` in the
  `os.env.[flag].installer` shape — never hardcode package lists. `before_` =
  dev/toolchains; `after_` = desktop. The desktop script's flag walk maps
  installers to bash arrays (`pacman`/`aur`/`flatpak`) and `services`/`groups`
  to post-install side effects.
- `run_once_` re-runs when rendered content changes (toggle a switch → new checksum → re-prompt).
- Self-gate: every script exits early unless on the right OS/env.
- **`caelestia`** (desktop-shell composite): AUR `caelestia-cli` + `caelestia-shell`; owns `~/.config/hypr` via `caelestia install` (**hypr component only** — others clobber chezmoi files). chezmoi ships only `dot_config/caelestia/{hypr-vars,hypr-user}.lua` plus `dot_config/caelestia/templates/theme.ghostty` (a caelestia **user template** the CLI renders to `~/.local/state/caelestia/theme/theme.ghostty`, which the ghostty config's `theme` points at).
- Retire: move to `archive/`, strip `run_`, add path to `.chezmoiignore`.

## Conventions

`dot_x` → `~/.x` · `.tmpl` → Go template · `run_*` → script · `archive/` = retired (ignored).

## Verify before committing

```bash
chezmoi apply --dry-run --verbose            # what would change
chezmoi execute-template < f.tmpl | bash -n  # render + shell-syntax check
uvx pre-commit run --all-files               # secrets/fixers/template render
```
