local function send_shortcut_once(mods, key)
	return function()
		hl.dispatch(hl.dsp.send_key_state({ mods = mods, key = key, state = "down", window = "activewindow" }))

		hl.timer(function()
			hl.dispatch(hl.dsp.send_key_state({ mods = mods, key = key, state = "up", window = "activewindow" }))
		end, { timeout = 50, type = "oneshot" })
	end
end

hl.bind(MainMod .. " + C", send_shortcut_once("CTRL", "Insert"))
hl.bind(MainMod .. " + V", send_shortcut_once("SHIFT", "Insert"))
hl.bind(MainMod .. " + X", send_shortcut_once("CTRL", "X"))
