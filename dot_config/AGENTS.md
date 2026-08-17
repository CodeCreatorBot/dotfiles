# AGENTS.md — dot_config/ → ~/.config/

- Everything here deploys under `~/.config/` (`dot_config/x/` → `~/.config/x/`); `.tmpl` suffix = template.
- **Gating lives elsewhere:** deploy is decided by root `.chezmoiignore` + `chezmoi.toml` `[data]` switches (`calestia` composite + per-tool; work-only configs are `work-dev`). Check those two before adding/removing a tree.
- **`create_` files** render once at init, never overwritten (opencode jsonc, pi). opencode `agents/`, `skills/`, `plugins/` are managed (sync on pull); the playwright bundle is an opt-in switch.
- **caelestia** owns `~/.config/hypr` (via `caelestia install`, hypr component only); chezmoi keeps only `caelestia/{hypr-vars,hypr-user}.lua`.
- **No secrets:** per-host secrets are untracked files, sourced if present.
