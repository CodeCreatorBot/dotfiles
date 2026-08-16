-- Move focus
hl.bind(MainMod .. " + left", hl.dsp.focus({ direction = "l" }))
hl.bind(MainMod .. " + right", hl.dsp.focus({ direction = "r" }))
hl.bind(MainMod .. " + up", hl.dsp.focus({ direction = "u" }))
hl.bind(MainMod .. " + down", hl.dsp.focus({ direction = "d" }))

-- Move/resize windows with MainMod + LMB/RMB and dragging
hl.bind(MainMod .. " + mouse:272", hl.dsp.window.drag(), { mouse = true })
hl.bind(MainMod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })

hl.bind(MainMod .. " + W", hl.dsp.window.close())

-- Capture
hl.bind(
	MainMod .. " + CTRL + C",
	hl.dsp.exec_cmd('grim - | satty -f - --copy-command wl-copy -o "~/Pictures/Screenshots/%Y%m%d_%H%M%S.png"')
)

-- Fullscreen toggle
hl.bind(MainMod .. " + F", hl.dsp.window.fullscreen())
hl.bind(MainMod .. " + T", hl.dsp.window.float({ action = "toggle" }))

-- Resize window (relative to 1st index)
hl.bind(MainMod .. " + minus", hl.dsp.window.resize({ x = -100, y = 0, relative = true }))
hl.bind(MainMod .. " + equal", hl.dsp.window.resize({ x = 100, y = 0, relative = true }))

hl.bind(MainMod .. " + SHIFT + left", hl.dsp.window.swap({ direction = "l" }))
hl.bind(MainMod .. " + SHIFT + right", hl.dsp.window.swap({ direction = "r" }))
hl.bind(MainMod .. " + SHIFT + up", hl.dsp.window.swap({ direction = "u" }))
hl.bind(MainMod .. " + SHIFT + down", hl.dsp.window.swap({ direction = "d" }))

hl.bind("ALT + TAB", hl.dsp.window.cycle_next())
hl.bind("ALT + SHIFT + TAB", hl.dsp.window.cycle_next({ next = false }))
hl.bind("ALT + TAB", hl.dsp.window.bring_to_top())
hl.bind("ALT + SHIFT + TAB", hl.dsp.window.bring_to_top())

-- Special
-- floating tui
hl.window_rule({
	match = { class = "com.floating.tui" },
	float = true,
	center = true,
})

-- btop
hl.window_rule({
	match = { class = "com.floating.btop" },
	float = true,
	center = true,
	size = { 1200, 900 },
})
