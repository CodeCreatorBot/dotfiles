#!/usr/bin/env bash
set -euo pipefail

worktree_path="${1:-}"
worktree_name="${2:-}"

if [[ -z "$worktree_path" || -z "$worktree_name" ]]; then
	echo "usage: tmux-worktree.sh <worktree_path> <worktree_name>" >&2
	exit 0
fi

if ! command -v tmux >/dev/null 2>&1; then
	exit 0
fi

if [[ -z "${TMUX:-}" ]]; then
	echo "tmux-worktree.sh: need to be in tmux session, skipping window creation" >&2
	exit 0
fi

session_name="$(tmux display-message -p '#S')"
window_name="${worktree_name: -8}"

tmux new-window -t "=${session_name}" -n "$window_name" -c "$worktree_path"
