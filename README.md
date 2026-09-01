# dotfiles

Managed with [chezmoi](https://www.chezmoi.io/).

## 1. Install git + chezmoi

**Arch**

```bash
sudo pacman -Sy --needed git chezmoi
```

**Fedora**

```bash
sudo dnf install -y git chezmoi
```

**Ubuntu**

```bash
sudo apt-get update && sudo apt-get install -y git
sh -c "$(curl -fsLS get.chezmoi.io)" -- -b ~/.local/bin init --apply CodeCreatorBot
```

**Windows** (winget)

```powershell
winget install -e --id Git.Git --accept-source-agreements
winget install -e --id twpayne.chezmoi --accept-source-agreements
```

## 2. Pull the dotfiles

```bash
chezmoi init --apply CodeCreatorBot
```

This creates `~/.config/chezmoi/chezmoi.toml` (with `env = "dev"`, the
default) and applies everything. On Linux, package scripts then prompt
`[y/N]` — each lists the full package set before installing anything.

## 3. Decisions — all in one file

Every decision lives in `~/.config/chezmoi/chezmoi.toml` (`[data]`). It is
the single source of truth for both what gets deployed and what gets
installed: change it, run `chezmoi apply`, done.

**Decision 1 — `env`:**

| env        | deploys                                                    |
|------------|------------------------------------------------------------|
| `dev`      | all dev tooling + toolchains (everything on, no switches)  |
| `work-dev` | dev + Azure DevOps / corporate tooling (Windows files additionally require a Windows host) |
| `desktop`  | dev + desktop environment (Hyprland + Caelestia Shell), switch-tuned |

**Decision 2 — desktop switches (only when `env = "desktop"`):** a single
`caelestia` composite switch installs the desktop-shell stack (Hyprland +
Caelestia Shell — replaces waybar/dunst/walker/matugen/satty/hyprlock/
hypridle/hyprpaper/elephant), plus per-tool switches (`onedrive`,
`obsidian`, `docker`) and one switch per optional application (`ai`,
`stremio`, `audiobooks`, `bitwarden`, `grayjay`, `nordvpn` — apps are
flags: opt-in, packages only). `false` skips that tool's files **and**
packages. Toggling a switch re-runs the desktop installer on next apply
(it re-renders with the new package list) and re-prompts.

**Decision 3 — package prompts, interactive:** during apply, each package
script asks `[y/N]`. Say N to skip that set. Nothing installs silently.

## 4. Day-to-day

```bash
chezmoi apply     # after editing chezmoi.toml or the repo
chezmoi update    # git pull + apply (get upstream changes)
```

- Toggle a desktop switch → `chezmoi apply` adds/removes its files and
  re-runs the installer (the `caelestia` switch re-renders the desktop
  run_once script → new checksum → re-prompt).
- Per-host secrets (`~/.bashrc.d/secrets.sh`, …) are never in this repo —
  create them directly on the machine; they're sourced if present.
- Dev-only, when editing this repo locally:
  `uvx pre-commit run --all-files` — secret scan + template checks on demand
  (config lives in the repo; nothing to install).
