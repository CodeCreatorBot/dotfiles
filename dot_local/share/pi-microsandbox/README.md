# pi-microsandbox

Disposable Microsandbox launcher for running `pi` inside a sandbox backed by a reusable snapshot.

## CLI

After build/install, the CLI command is:

```bash
pi-msb [dir] [-n name] [--snapshot name-or-path] [--refresh-baseline-snapshot] [-r sandbox-name]
```

## Baseline snapshot workflow

By default, `pi-msb` uses one global Microsandbox snapshot named `pi-msb-baseline`.

On a normal non-resume launch:

- if `pi-msb-baseline` exists, it is used immediately
- if it is missing, `pi-msb` creates it automatically and logs that creation on stderr

The default baseline snapshot is created from `node:22-bookworm-slim` and includes:

- `@earendil-works/pi-coding-agent@0.79.1`
- `uv` and `uvx`
- `fd` and `rg`
- `ca-certificates`, `curl`, `fd-find`, `git`, `python3`, `ripgrep`

If you pass `--snapshot <name-or-path>`, `pi-msb` uses that existing snapshot (snapshot name or explicit artifact path) and does **not** auto-create it.

To repair or rebuild the default baseline snapshot in place, run:

```bash
pi-msb --refresh-baseline-snapshot
```

`--refresh-baseline-snapshot` only applies to the default `pi-msb-baseline` snapshot and cannot be combined with `--snapshot` or `--resume-sandbox`.

## Runtime behavior

- Creates a new sandbox by default, mounts your workspace at `/workspace`, and starts `pi` interactively.
- Boots new sandboxes from the selected snapshot (`pi-msb-baseline` by default, or `--snapshot` override).
- Mounts host Pi config/data if present:
  - `~/.pi` -> `/root/.pi`
  - `~/.config/pi` -> `/root/.config/pi`
  - `~/.local/share/pi` -> `/root/.local/share/pi`
- If `-r/--resume-sandbox` is used, resumes that named sandbox instead of creating one. In resume mode, the optional `dir` is ignored and snapshot checks/creation are skipped.
- `--refresh-baseline-snapshot` rebuilds `pi-msb-baseline` before launching a new sandbox.
- If sandbox creation hits an existing sandbox name, `pi-msb` reconnects to it or starts it automatically.
- In non-resume mode, if sandbox startup hits a BootStart-style failure, `pi-msb` cleans up and recreates that sandbox automatically.
- Proxy passthrough (`HTTP_PROXY`, `HTTPS_PROXY`, `ALL_PROXY`, plus lowercase variants) keeps host values, but rewrites loopback targets (`127.0.0.1`, `::1`, `localhost`) to `host.microsandbox.internal` so sandboxed tools can still reach a host-local proxy.
- `NODE_EXTRA_CA_CERTS` is set to `/etc/ssl/certs/ca-certificates.crt` so Node-based tools inside the sandbox use the guest CA bundle populated by `trustHostCAs(true)`.
- New sandboxes are disposable by default: when `pi` exits, `pi-msb` kills/removes the sandbox.
- Resume mode (`-r`) keeps the sandbox after exit.

## Examples

```bash
# Create disposable sandbox in current directory and run pi inside it
pi-msb

# Create disposable sandbox for a specific repo path
pi-msb ~/work/my-repo

# Provide explicit sandbox name for a new sandbox
pi-msb ~/work/my-repo -n my-pi-session

# Use a specific existing snapshot name (no auto-creation)
pi-msb ~/work/my-repo --snapshot my-existing-snapshot

# Use a specific existing snapshot artifact path (no auto-creation)
pi-msb ~/work/my-repo --snapshot ~/.local/share/microsandbox/snapshots/my-snapshot

# Rebuild the default baseline snapshot in place, then launch
pi-msb --refresh-baseline-snapshot

# Resume an existing sandbox by name (dir is ignored in resume mode)
pi-msb -r my-pi-session
```

## Requirements

- `pi-msb` requires host access to `/dev/kvm` because Microsandbox uses KVM virtualization.
- If `/dev/kvm` exists but you get a permission error, add your user to the `kvm` group and start a new login session before retrying.
- Baseline auto-creation requires network access from the bootstrap sandbox to install required tools.

```bash
sudo usermod -aG kvm "$USER"
```

## Build

After applying this repo with chezmoi, build from the runtime path that `pi-msb` uses:

```bash
cd ~/.local/share/pi-microsandbox
npm install
npm run build
```

## Focused validation checklist

First, make sure the runtime CLI builds successfully and `dist/cli.js` exists:

```bash
cd ~/.local/share/pi-microsandbox
npm run build
pi-msb --help
```

When KVM and Microsandbox are available, validate default, refresh, and override flows:

```bash
# default flow (auto-creates pi-msb-baseline if needed)
pi-msb

# refresh flow (rebuilds pi-msb-baseline before launch)
pi-msb --refresh-baseline-snapshot

# override flow (must reference an existing snapshot name or path)
pi-msb --snapshot my-existing-snapshot
```

Expected outcomes:

- `npm run build` succeeds and produces the runtime CLI used by `pi-msb`.
- Fresh default launch auto-creates `pi-msb-baseline` when missing, then launches `pi`.
- `--refresh-baseline-snapshot` provides a supported repair/rebuild path for the default baseline snapshot.
- `--snapshot` launches from an existing snapshot name/path and fails clearly when missing.
- Launch path does not perform runtime fallback install of `pi`.
