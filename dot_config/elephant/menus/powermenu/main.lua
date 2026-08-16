Name = "powermenu"
NamePretty = "Power Menu"
FixedOrder = true
Cache = false
Action = "%VALUE%"
-- history = true
-- history_when_empty = true
-- hide_from_providerlist = false
-- search_name = false
--
function GetEntries()
	return {
		{
			Text = "Lock",
			Subtext = "Lock the screen",
			Icon = "system-lock-screen",
			Value = "loginctl lock-session",
		},
		{

			Text = "  Suspend",
			Subtext = "Suspend to RAM",
			Icon = "system-suspend",
			Value = "systemctl suspend",
		},
		{
			Text = "Reboot",
			Subtext = "Restart the system",
			Icon = "system-reboot",
			Value = "reboot",
		},
		{
			Text = "Shutdown",
			Subtext = "Power off the system",
			Icon = "system-shutdown",
			Value = "poweroff",
		},
	}
end
