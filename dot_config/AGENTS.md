# AGENTS.md — dot_config/ → ~/.config/

Per-app config trees, each self-explanatory in its own directory. Only the
shared mechanics are documented here.

- **Mapping:** everything here deploys under `~/.config/` (`dot_config/git/`
  → `~/.config/git/`). `.tmpl` suffix → Go template (`git/config.tmpl`,
  `onedrive/config.tmpl`).
- **`create_` files render once at init, never overwritten** (opencode
  jsonc, pi settings) — per-host edits persist; no keys in them.
- **opencode:** `create_opencode.jsonc` is host-specific (`create_`); `agents/`,
  `skills/`, `plugins/` are **managed** and sync on pull. The playwright bundle
  (`agents/playwright-*`, `skills/playwright-cli`) is opt-in via the
  `opencode_playwright` switch (root `.chezmoiignore`).
- **Gating lives elsewhere:** deployment is decided by the root `.chezmoiignore`
  - `chezmoi.toml` `[data]` — desktop/tool dirs are switch-gated (hypr,
  waybar, dunst, …), work-only config (azure-devops-cli, powershell) is
  `work-dev`. **Check those two files before adding or removing a config tree.**
- **No secrets:** per-host secrets are untracked files sourced if present
  (see root `AGENTS.md`).
