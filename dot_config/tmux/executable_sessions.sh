#!/usr/bin/env bash
# Ensure the tmux sessions we care about exist before we start working.
command -v tmux >/dev/null 2>&1 || exit 0

SESSION="$1"

if [ -z "$SESSION" ]; then
	echo "Usage: tmuxl <session-name>"
	exit 1
fi

# If session exists → attach
if tmux has-session -t "$SESSION" 2>/dev/null; then
	tmux attach -t "$SESSION"
	exit 0
fi

# If session does not exist → create it and attach
case "$SESSION" in
chezmoi)
	tmux new-session -d -s chezmoi -n editor
	tmux send-keys -t chezmoi:editor "cd \"\$(chezmoi source-path)\" && nvim ." C-m
	echo "tmux - started new chezmoi session"
	;;
learnccl)
	session_name="learnccl"
	learnccl_root="$REPO/learnccl"
	setup_cmd="cd \"$learnccl_root\""

	tmux new-session -d -s "$session_name" -n editor
	tmux send-keys -t "$session_name:editor" "$setup_cmd && nvim ." C-m
	tmux split-window -h -t "$session_name:editor"
	tmux send-keys -t "$session_name:editor.2" "$setup_cmd && opencode --port" C-m

	echo "tmux - started new learnccl session"
	;;
esp)
	tmux new-session -d -s esp -n editor
	tmux send-keys -t esp:editor "cd repo && cd esp && nvim ." C-m
	tmux new-window -t esp:2 -n terminal
	tmux send-keys -t esp:terminal "source /opt/esp-idf/export.sh" C-m
	echo "tmux - started new esp session"
	;;
homeserver)
	tmux new-session -d -s homeserver -n editor
	tmux send-keys -t homeserver:editor "cd repo && cd homeserver && nvim ." C-m
	echo "tmux - started new homeserver session"
	;;
*)
	echo "tmux - unknown session name: $SESSION"
	exit 1
	;;
esac
tmux attach -t "$SESSION"
