# Caelestia + CachyOS: Quickshell fork hijack

Runbook for "caelestia install'ed, no visual interface, no working keybinds
after reboot" on CachyOS (Arch works out of the box — see below).

## Symptom

- Hyprland boots and loads `~/.config/hypr/hyprland.lua`, monitors come up,
  but there are no panels / wallpaper / launcher and `caelestia:*` bindings
  seem dead.
- `caelestia shell` exits immediately with:

  ```
  ERROR: Unrecognized pragma "DefaultEnv QS_NO_RELOAD_POPUP=1"
  ```

## Root cause

- `DefaultEnv` pragma requires Quickshell >= 0.3.0 (added in v0.3.0; older
  builds also treat unknown pragmas as a hard error).
- CachyOS ships `cachyos/noctalia-qs` (a stale Quickshell fork for the
  competing Noctalia shell) that `Provides: quickshell quickshell-git`. So it
  hijacks the `quickshell-git` dependency of `caelestia-shell`:
  - `yay -S quickshell-git` still resolves to the repo fork (repo beats AUR;
    `--ignore`/`IgnorePkg` do NOT stop an explicitly-named target).
  - The fork can't parse caelestia's `DefaultEnv` pragma -> shell dies.

## Fix (CachyOS)

Replace the fork with the official binary and point caelestia-shell at it:

```bash
# 1) drop the fork (nothing depends on it once caelestia-shell is removed)
sudo pacman -R noctalia-qs

# 2) official Quickshell 0.3.0 (has DefaultEnv)
sudo pacman -S --needed quickshell

# 3) build caelestia-shell locally against `quickshell` instead of `quickshell-git`
git clone https://aur.archlinux.org/caelestia-shell.git
cd caelestia-shell
sed -i 's/quickshell-git/quickshell/' PKGBUILD
makepkg -sic
```

The runtime deps of caelestia-shell (`ddcutil`, `brightnessctl`, `aubio`,
`qt6-imageformats`, `ttf-material-symbols-variable` from repos; `libcava`,
`ttf-rubik-vf` from AUR) are re-pulled as needed. `makepkg -si` runs
`pacman -U` on the built package, so there is no provider resolution to
hijack.

## Prevention

```bash
printf '\n# Caelestia needs real quickshell-git, not the noctalia fork\nIgnorePkg = noctalia-qs\n' | sudo tee -a /etc/pacman.conf
```

Do NOT install `noctalia-shell` (it forces `noctalia-qs` back in and breaks
caelestia again).

## Verify + relaunch

```bash
pacman -Qo /usr/bin/quickshell      # expect: quickshell 0.3.0 (extra/cachyos-extra-v3)
export XDG_RUNTIME_DIR=/run/user/1000
export HYPRLAND_INSTANCE_SIGNATURE=$(basename "$(ls -d /run/user/1000/hypr/*/ | head -1)")
hyprctl dispatch exec "caelestia shell -d"
# or reboot — shell auto-starts via execs.lua hyprland.start
```

`caelestia shell` should log `Launching config: /etc/xdg/quickshell/caelestia/shell.qml`
with no `Unrecognized pragma` error.

## Keybinds reference

- Combos: `~/.config/hypr/variables.lua` (`kb* = "SUPER + T"`, etc.)
- Actions: `~/.config/hypr/hyprland/keybinds.lua`
- Per-host overrides: `~/.config/caelestia/hypr-user.lua`
- Terminal: `rg 'kb[A-Za-z]+ *=' ~/.config/hypr/variables.lua`

## Plain Arch note

Not applicable. On vanilla Arch nothing provides `quickshell-git` except the
AUR package of the same name, so `yay -S caelestia-shell` just builds it
(current upstream HEAD supports `DefaultEnv`; ~10-20 min compile). No sed
patch, no makepkg detour.
