-- Per-host Hyprland tweaks, require()'d by caelestia's hyprland.lua after
-- its defaults (package.path includes ~/.config/caelestia/?.lua). Only what
-- differs from the dots' defaults lives here; app launching itself (terminal,
-- browser) is handled by the vars in hypr-vars.lua.

-- NVIDIA driver env (was dot_config/hypr/nvidia.lua before Caelestia adoption)
-- hl.env("LIBVA_DRIVER_NAME", "nvidia")
-- hl.env("__GLX_VENDOR_LIBRARY_NAME", "nvidia")

hl.config({
	input = {
		touchpad = {
			natural_scroll = false, -- non-inverse scrolling
		},
	},
})

-- Web apps (zen-browser --new-window); keybinds that don't clash with caelestia defaults
hl.bind("SUPER + SHIFT + E", hl.dsp.exec_cmd('zen-browser --new-window "https://gmail.com"'))
hl.bind("SUPER + SHIFT + R", hl.dsp.exec_cmd('zen-browser --new-window "https://github.com"'))
hl.bind("SUPER + SHIFT + A", hl.dsp.exec_cmd('zen-browser --new-window "https://hermes.amisra.net"'))
hl.bind("SUPER + SHIFT + ALT + N", hl.dsp.exec_cmd('zen-browser --new-window "https://netflix.com"'))

-- Media apps
hl.bind("SUPER + SHIFT + V", hl.dsp.exec_cmd("flatpak run com.stremio.Stremio"))

-- Laptops

-- switch binds fire only on toggles, never on the initial state: read ACPI state
-- once at startup so a boot with the lid already closed starts clamshell.
local function lid_closed()
	for _, lid in ipairs({ "LID0", "LID" }) do
		local f = io.open("/proc/acpi/button/lid/" .. lid .. "/state")
		if f then
			local state = f:read("*a") or ""
			f:close()
			return state:find("closed") ~= nil
		end
	end
	return false
end

hl.monitor({ output = "eDP-1", scale = 1.5, position = "auto-left", disabled = lid_closed() })

-- switch:off = closed on this machine; some firmware report reversed (swap on/off).
-- Lid Closed Event
hl.bind("switch:on:Lid Switch", function()
	-- Check if an external display is present before turning off the main screen
	local monitors = hl.get_monitors()
	if #monitors > 1 then
		local targetMonitor = nil
		for _, mon in ipairs(monitors) do
			if mon.name ~= "eDP-1" then
				targetMonitor = mon.name
				break
			end
		end

		hl.dispatch(hl.dsp.workspace.swap_monitors({ monitor1 = "eDP-1", monitor2 = targetMonitor }))
		hl.monitor({ output = "eDP-1", disabled = true })
	end
end, { locked = true })

-- Lid Opened Event
hl.bind("switch:off:Lid Switch", function()
	hl.monitor({ output = "eDP-1", disabled = false, position = "auto-left" })
end, { locked = true })
