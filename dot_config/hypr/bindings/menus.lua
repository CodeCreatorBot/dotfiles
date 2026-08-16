local launcher = "walker"

hl.bind(MainMod .. " + Space", hl.dsp.exec_cmd(launcher))
hl.bind(MainMod .. " + escape", hl.dsp.exec_cmd(launcher .. " -m menus:powermenu"))
