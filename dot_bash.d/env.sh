# Sourced from ~/.bashrc via the ~/.bashrc.d/*.sh glob. Not intended for /bin/sh.

export SHELL=/bin/bash

# volta (node)
VOLTA_PATH="$HOME/.volta/bin"
if [ -d "$VOLTA_PATH" ]; then
	export PATH="$VOLTA_PATH:$PATH"
fi

# cargo (rust)
CARGO_PATH="$HOME/.cargo/bin"
if [ -d "$CARGO_PATH" ]; then
	export PATH="$CARGO_PATH:$PATH"
fi

# local bin
LOCAL_BIN_PATH="$HOME/.local/bin"
if [ -d "$LOCAL_BIN_PATH" ]; then
	export PATH="$LOCAL_BIN_PATH:$PATH"
fi

# opencode (curl-installed toolchain)
OPENCODE_PATH="$HOME/.opencode/bin"
if [ -d "$OPENCODE_PATH" ]; then
	export PATH="$OPENCODE_PATH:$PATH"
fi

# opencode
export OPENCODE_EXPERIMENTAL=true
export OPENCODE_ENABLE_EXA=0

# --- TOOL INITIALISATIONS ---
if command -v starship >/dev/null 2>&1; then
	eval "$(starship init bash)"
fi
if command -v atuin >/dev/null 2>&1; then
	eval "$(atuin init bash)"
fi
if command -v zoxide >/dev/null 2>&1; then
	eval "$(zoxide init bash)"
fi
if command -v uv >/dev/null 2>&1; then
	eval "$(uv generate-shell-completion bash)"
fi
if command -v uvx >/dev/null 2>&1; then
	eval "$(uvx --generate-shell-completion bash)"
fi
if command -v wt >/dev/null 2>&1; then
	eval "$(command wt config shell init bash)" # worktrunk
fi
