-- Per-host Hyprland tweaks, require()'d by caelestia's hyprland.lua after
-- its defaults (package.path includes ~/.config/caelestia/?.lua). Only what
-- differs from the dots' defaults lives here; app launching itself (terminal,
-- browser) is handled by the vars in hypr-vars.lua.

-- NVIDIA driver env (was dot_config/hypr/nvidia.lua before Caelestia adoption)
hl.env("LIBVA_DRIVER_NAME", "nvidia")
hl.env("__GLX_VENDOR_LIBRARY_NAME", "nvidia")

hl.config({
	input = {
		touchpad = {
			natural_scroll = false, -- non-inverse scrolling
		},
	},
})

-- Web apps (zen --new-window); keybinds that don't clash with caelestia defaults
hl.bind("SUPER + SHIFT + E", hl.dsp.exec_cmd('zen --new-window "https://gmail.com"'))
hl.bind("SUPER + SHIFT + R", hl.dsp.exec_cmd('zen --new-window "https://github.com"'))
hl.bind("SUPER + SHIFT + A", hl.dsp.exec_cmd('zen --new-window "https://hermes.amisra.net"'))
hl.bind("SUPER + SHIFT + ALT + N", hl.dsp.exec_cmd('zen --new-window "https://netflix.com"'))

-- Media apps
hl.bind("SUPER + SHIFT + V", hl.dsp.exec_cmd("flatpak run com.stremio.Stremio"))
