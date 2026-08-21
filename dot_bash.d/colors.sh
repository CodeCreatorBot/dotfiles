# Sourced from ~/.bashrc.d/*.sh glob. Applies caelestia's Material-You OSC
# colour palette to the running terminal, mirroring what fish's config.fish
# does with `cat ~/.local/state/caelestia/sequences.txt`.

if [ -r "$HOME/.local/state/caelestia/sequences.txt" ]; then
	cat "$HOME/.local/state/caelestia/sequences.txt"
fi
