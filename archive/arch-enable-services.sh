{{ if eq .chezmoi.osRelease.id "arch" -}}
#!/bin/bash
set -euo pipefail

# .packages.arch hash: {{ .packages.arch | toString | sha256sum }}

# Onedrive
if ! systemctl --user --quiet is-enabled onedrive; then
    systemctl --user enable --now onedrive
    echo "onedrive: Please log in"
fi

# Nordvpn
if ! systemctl --quiet is-enabled nordvpnd; then
    sudo usermod -aG nordvpn $USER
    sudo systemctl enable --now nordvpnd
    echo "nordvpn: Please reboot system"
fi

# Syncthing
if ! systemctl --user --quiet is-enabled syncthing; then
    systemctl --user enable --now syncthing
    echo "syncthing: has been enabled"
fi

{{ end -}}
