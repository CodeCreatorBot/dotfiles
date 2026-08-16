# pi-ignore

A global pi extension that makes pi treat ignored paths as unavailable inside Git repositories.

## What it does

- blocks `read` on files ignored by Git or matched by `.pi/.ignore`
- blocks `write` and `edit` on ignored targets
- filters ignored entries out of `ls`
- blocks `bash` when it contains obvious explicit ignored paths or redirection targets
- adds a system-prompt hint so the agent prefers unignored files

Outside a Git repository, the extension is inert.

## `.pi/.ignore`

Add a `.pi/.ignore` file at the repository root to hide extra files from pi while keeping normal Git ignore behavior unchanged.

## Notes

- `find` and `grep` already respect `.gitignore` through `fd` and `ripgrep`, so this extension leaves them alone.
- `.pi/.ignore` uses gitignore-style patterns, including `#` comments and `!` negation.
- `bash` enforcement is intentionally best-effort for speed. It checks obvious literal paths and redirection targets, not every possible shell expansion.
- After applying with chezmoi, reload pi with `/reload` if it is already running.
