-- Extra Binds
local shiftMod = MainMod .. " + SHIFT"
local shiftAltMod = MainMod .. " + SHIFT + ALT"
local ctrlMod = MainMod .. " + CTRL"

-- terminal exec
local terminal = "ghostty"
local tuiOpen = function(prog, cls)
	cls = cls or "com.floating.tui"
	return terminal .. " --class=" .. cls .. " -e " .. prog
end

-- browser
local browser = "chromium"
local webAppOpen = function(url)
	return "chromium --app=" .. url
end

-- system
hl.bind(MainMod .. " + Return", hl.dsp.exec_cmd(terminal))
hl.bind(ctrlMod .. " + B", hl.dsp.exec_cmd(tuiOpen("bluetui"))) -- bluetooth tui
hl.bind(ctrlMod .. " + I", hl.dsp.exec_cmd(tuiOpen("impala"))) -- bluetooth tui
hl.bind(ctrlMod .. " + T", hl.dsp.exec_cmd(tuiOpen("btop", "com.floating.btop")))

-- apps
hl.bind(shiftMod .. " + F", hl.dsp.exec_cmd("nautilus"))
hl.bind(shiftMod .. " + B", hl.dsp.exec_cmd(browser))
hl.bind(shiftMod .. " + G", hl.dsp.exec_cmd("steam"))
hl.bind(shiftMod .. " + S", hl.dsp.exec_cmd("flatpak run com.stremio.Stremio"))

-- web apps
hl.bind(shiftMod .. " + E", hl.dsp.exec_cmd(webAppOpen("https://gmail.com")))
hl.bind(shiftMod .. " + C", hl.dsp.exec_cmd(webAppOpen("https://web.whatsapp.com")))
hl.bind(shiftMod .. " + R", hl.dsp.exec_cmd(webAppOpen("https://github.com")))
hl.bind(shiftMod .. " + A", hl.dsp.exec_cmd(webAppOpen("https://hermes.amisra.net")))
hl.bind(shiftAltMod .. " + N", hl.dsp.exec_cmd(webAppOpen("https://netflix.com")))
