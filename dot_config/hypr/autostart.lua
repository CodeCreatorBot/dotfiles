hl.on("hyprland.start", function()
	hl.exec_cmd("hyprpolkitagent") -- authentication agent
	hl.exec_cmd("hypridle") -- idle service management
	hl.exec_cmd("hyprpaper") -- wallpaper
	hl.exec_cmd("dunst") -- notification
	hl.exec_cmd("waybar") -- status bur
	hl.exec_cmd("systemctl --user start elephant") -- menu data provider
	hl.exec_cmd("walker --gapplication-service") -- menu
end)
