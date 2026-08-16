{{ if .chezmoiscripts }}
#!/usr/bin/env bash
set -euo pipefail

echo "==> Bootstrap starting"

###############################################################################
# Multilib
###############################################################################

{{ if .multilib }}
if ! grep -q "^\[multilib\]" /etc/pacman.conf; then
	sudo tee -a /etc/pacman.conf >/dev/null <<'EOF'

[multilib]
Include = /etc/pacman.d/mirrorlist
EOF
fi
sudo pacman -Sy
{{ end }}

###############################################################################
# yay
###############################################################################

{{ if .yay }}
if ! command -v yay >/dev/null 2>&1; then
	tmp="$(mktemp -d)"
	git clone https://aur.archlinux.org/yay-bin.git "$tmp/yay-bin"

	pushd "$tmp/yay-bin"
	makepkg -si --noconfirm
	popd

	rm -rf "$tmp"
fi
{{ end }}

###############################################################################
# Flatpak remote
###############################################################################

{{ if .flatpak }}
if ! flatpak remote-list | grep -q flathub; then
	flatpak remote-add --if-not-exists \
		flathub \
		https://flathub.org/repo/flathub.flatpakrepo
fi
{{ end }}

###############################################################################
# Pacman
###############################################################################

PACMAN=()

{{ if .git }}
PACMAN+=(
	git
)
{{ end }}

{{ if .base_devel }}
PACMAN+=(
	base-devel
)
{{ end }}

{{ if .chezmoiscripts }}
PACMAN+=(
	chezmoi
)
{{ end }}

{{ if .yay }}
PACMAN+=(
	go
)
{{ end }}

{{ if .flatpak }}
PACMAN+=(
	flatpak
)
{{ end }}

{{ if .cli_tools }}
PACMAN+=(
	eza
	zoxide
	atuin
	fzf
)
{{ end }}

{{ if .bash }}
PACMAN+=(
	bash-completion
)
{{ end }}

{{ if .git }}
PACMAN+=(
	github-cli
)
{{ end }}

{{ if .ghostty }}
PACMAN+=(
	ghostty
)
{{ end }}

{{ if .chromium }}
PACMAN+=(
	chromium
)
{{ end }}

{{ if .hypr }}
PACMAN+=(
	hyprland
	xdg-desktop-portal-hyprland
	hyprpolkitagent
	qt5-wayland
	qt6-wayland
	hyprpaper
	hypridle
	hyprlock
	impala
	grim
	wl-clipboard
)
{{ end }}

{{ if .waybar }}
PACMAN+=(
	waybar
)
{{ end }}

{{ if .dunst }}
PACMAN+=(
	dunst
)
{{ end }}

{{ if .matugen }}
PACMAN+=(
	matugen
)
{{ end }}

{{ if .iwd }}
PACMAN+=(
	iwd
)
{{ end }}

{{ if .satty }}
PACMAN+=(
	satty
)
{{ end }}

{{ if .nvim }}
PACMAN+=(
	neovim
)
{{ end }}

{{ if .lazygit }}
PACMAN+=(
	lazygit
)
{{ end }}

{{ if .starship }}
PACMAN+=(
	starship
)
{{ end }}

{{ if .obsidian }}
PACMAN+=(
	obsidian
)
{{ end }}

{{ if .tmux }}
PACMAN+=(
	tmux
)
{{ end }}

if [ ${#PACMAN[@]} -gt 0 ]; then
	sudo pacman -Sy --needed --noconfirm "${PACMAN[@]}"
fi

###############################################################################
# AUR
###############################################################################

AUR=()

{{ if .walker }}
AUR+=(
	walker
)
{{ end }}

{{ if .elephant }}
AUR+=(
	elephant-all
)
{{ end }}

{{ if .onedrive }}
AUR+=(
	onedrive-abraunegg
)
{{ end }}

if [ ${#AUR[@]} -gt 0 ]; then
	yay -S --needed --noconfirm "${AUR[@]}"
fi

###############################################################################
# Native installers
###############################################################################

{{ if .node }}
if ! command -v volta >/dev/null 2>&1; then
	curl https://get.volta.sh | bash
fi
{{ end }}

{{ if .python }}
if ! command -v uv >/dev/null 2>&1; then
	curl -LsSf https://astral.sh/uv/install.sh | sh
fi
{{ end }}

{{ if .rust }}
if ! command -v rustup >/dev/null 2>&1; then
	curl https://sh.rustup.rs -sSf | sh -s -- -y
fi
{{ end }}

{{ if .herdr }}
if ! command -v herdr >/dev/null 2>&1; then
	curl -fsSL https://herdr.dev/install.sh | sh
fi
{{ end }}

{{ if .opencode }}
if ! command -v opencode >/dev/null 2>&1; then
	curl -fsSL https://opencode.ai/install | bash
fi
{{ end }}

###############################################################################
# Toolchains
###############################################################################

export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$HOME/.cargo/bin:$HOME/.local/bin:$PATH"

{{ if .node }}
volta install node
{{ end }}

{{ if .python }}
uv python install
{{ end }}

{{ if .rust }}
cargo install --locked worktrunk
{{ end }}

{{ if .pi }}
volta install @earendil-works/pi-coding-agent
{{ end }}

###############################################################################
# Services
###############################################################################

{{ if .docker }}
sudo usermod -aG docker "$USER"
{{ end }}

{{ if .systemd }}
{{ if .docker }}
sudo systemctl enable docker.service
{{ end }}
{{ if .bluetooth }}
sudo systemctl enable bluetooth.service
{{ end }}
{{ end }}

{{ if .iwd }}
sudo systemctl enable iwd.service
{{ end }}

echo
echo "Bootstrap complete."
echo "Log out and back in for any group changes to take effect."
{{ else }}
#!/usr/bin/env bash
# chezmoiscripts disabled — skipping bootstrap
exit 0
{{ end }}
