#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<EOF
Usage:
  $git-clone-bare <repo> [--dir <directory>]
  $git-clone-bare <repo> [directory]

Description:
  Bootstrap a bare-repo + gitdir setup for git worktrees.

Examples:
  $git-clone-bare https://github.com/example/workit.git
  $git-clone-bare git@github.com:example/workit.git --dir workit
  $git-clone-bare git@github.com:example/workit.git workit
EOF
}

die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

derive_dir_name() {
  local repo="$1"
  local trimmed
  local name

  trimmed="${repo%/}"
  name="${trimmed##*/}"

  if [ "$name" = "$trimmed" ]; then
    name="${trimmed##*:}"
  fi

  name="${name%.git}"

  if [ -z "$name" ] || [ "$name" = "." ] || [ "$name" = ".." ]; then
    die "Could not derive directory name from repo: $repo"
  fi

  printf '%s\n' "$name"
}

detect_default_branch() {
  local dir="$1"
  local remote_head

  remote_head="$(git -C "$dir" symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null || true)"
  if [ -n "$remote_head" ]; then
    printf '%s\n' "${remote_head#origin/}"
    return
  fi

  if git -C "$dir" show-ref --verify --quiet refs/remotes/origin/main; then
    printf 'main\n'
    return
  fi

  if git -C "$dir" show-ref --verify --quiet refs/remotes/origin/master; then
    printf 'master\n'
    return
  fi

  printf 'main\n'
}

command -v git >/dev/null 2>&1 || die "git is required"

if [ "$#" -eq 0 ]; then
  usage
  exit 1
fi

repo=""
target_dir=""

while [ "$#" -gt 0 ]; do
  case "$1" in
  -h | --help)
    usage
    exit 0
    ;;
  --dir | -d)
    shift
    [ "$#" -gt 0 ] || die "--dir requires a value"
    [ -z "$target_dir" ] || die "directory specified more than once"
    target_dir="$1"
    ;;
  --)
    shift
    break
    ;;
  -*)
    die "unknown option: $1"
    ;;
  *)
    if [ -z "$repo" ]; then
      repo="$1"
    elif [ -z "$target_dir" ]; then
      target_dir="$1"
    else
      die "unexpected extra argument: $1"
    fi
    ;;
  esac
  shift
done

[ -n "$repo" ] || die "repo is required"

if [ -z "$target_dir" ]; then
  target_dir="$(derive_dir_name "$repo")"
fi

[ -n "$target_dir" ] || die "directory name is required"

if [ -e "$target_dir" ] && [ ! -d "$target_dir" ]; then
  die "target exists and is not a directory: $target_dir"
fi

if [ -d "$target_dir" ] && [ -n "$(ls -A "$target_dir" 2>/dev/null || true)" ]; then
  die "target directory is not empty: $target_dir"
fi

mkdir -p "$target_dir"

git clone --bare "$repo" "$target_dir/.bare"
printf 'gitdir: ./.bare\n' >"$target_dir/.git"

git -C "$target_dir" config --local remote.origin.fetch '+refs/heads/*:refs/remotes/origin/*'
git -C "$target_dir" config --local fetch.prune true
git -C "$target_dir" config --local remote.origin.prune true
git -C "$target_dir" config --local worktree.guessRemote true

git -C "$target_dir" fetch origin --prune
git -C "$target_dir" remote set-head origin --auto >/dev/null 2>&1 || true

default_branch="$(detect_default_branch "$target_dir")"

printf '\nBootstrap complete.\n\n'
printf 'Repo root: %s\n' "$target_dir"
printf 'Bare dir : %s\n' "$target_dir/.bare"
printf 'Git link : %s\n' "$target_dir/.git"

printf '\nNext steps:\n'
printf '  cd %q\n' "$target_dir"
printf '  git worktree add -b %q %q origin/%q\n' "$default_branch" "$default_branch" "$default_branch"
printf '  git worktree add -b feature/my-change feature-my-change %q\n' "$default_branch"
printf '\nLazygit tip: open lazygit inside a worktree directory, not in %q.\n' "$target_dir"
