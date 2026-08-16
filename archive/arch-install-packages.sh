{{ if eq .chezmoi.osRelease.id "arch" -}}
#!/bin/bash
set -euo pipefail

# .packages.arch hash: {{ .packages.arch | toString | sha256sum }}

if command -v pacman &> /dev/null; then
  {{ range .packages.arch.pacman.main -}}
  sudo pacman -S --needed --noconfirm {{ . | quote }}
  {{ end }}
fi


if command -v yay &> /dev/null; then
  {{ range .packages.arch.yay.main -}}
  yay -S --needed --noconfirm {{ . | quote }}
  {{ end }}
fi

if ! command -v flatpak &> /dev/null; then
  echo "Installing flatpak"
  sudo pacman -S --needed --noconfirm flatpak
fi

{{ range .packages.arch.flatpak.main.flathub -}}
flatpak install flathub {{ . | quote }}
{{ end -}}

{{ range $name, $cmd := .packages.arch.native -}}
  if ! command -v {{ $cmd }} &> /dev/null; then
    echo "Installing {{ $name }}"
    bash -lc {{ $cmd | quote }}
  fi
{{ end -}}

{{ end -}}
