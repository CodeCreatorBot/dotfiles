#!/usr/bin/env bash
set -euo pipefail

# 1. Update package manager and install core packages
if [ -f /etc/fedora-release ]; then
	echo "==> Configuring Fedora..."
	dnf install -y git curl sudo findutils procps-ng
elif grep -qs '^ID=ubuntu' /etc/os-release; then
	echo "==> Configuring Ubuntu..."
	export DEBIAN_FRONTEND=noninteractive
	apt-get update
	apt-get install -y git curl sudo ca-certificates
elif [ -f /etc/arch-release ]; then
	echo "==> Configuring Arch..."
	pacman -Sy --noconfirm git curl sudo base-devel
else
	echo "Unsupported OS"
	exit 1
fi

# 2. Create a test user with sudo access
useradd -m -s /bin/bash testuser || true
echo "testuser ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/testuser
chmod 0440 /etc/sudoers.d/testuser

# 3. Switch to testuser and run chezmoi
sudo -u testuser -i bash <<'USER_EOF'
set -eu
export HOME=/home/testuser
export PATH="$HOME/.local/bin:$PATH"

# Install chezmoi
sh -c "$(curl -fsLS get.chezmoi.io)" -- -b "$HOME/.local/bin"

# Copy mounted repo to default chezmoi source path
mkdir -p "$HOME/.local/share"
cp -r /repo "$HOME/.local/share/chezmoi"

# Init chezmoi
chezmoi init

# Change env to dev
sed -i 's/env = "desktop"/env = "dev"/g' "$HOME/.config/chezmoi/chezmoi.toml"

# Run apply
echo "y" | chezmoi apply -v

# Verification
echo "==> Verification: files in home directory:"
find "$HOME" -maxdepth 3 -not -path '*/.*' -o -name '.config'
USER_EOF
