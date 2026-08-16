#!/usr/bin/env node

import process from "node:process";
import {
	buildLaunchEnvironment,
	cleanupSandbox,
	getDefaultSnapshotName,
	getSandboxWorkdir,
	startPiSandbox,
	type StartPiSandboxOptions,
} from "./index.js";

interface CliArgs {
	dir: string;
	name?: string;
	snapshot?: string;
	refreshBaselineSnapshot?: boolean;
	resumeSandbox?: string;
}

function printUsage(): void {
	console.log(`Usage: pi-msb [dir] [-n name] [--snapshot name-or-path] [--refresh-baseline-snapshot] [-r sandbox-name]

Starts a microsandbox, opens an interactive terminal session, and launches pi.

Arguments:
  dir                               Workspace directory (default: current directory)

Options:
  -n, --name <name>                 Sandbox name for new sandbox creation
      --snapshot <snapshot>         Use an existing snapshot name or path
      --refresh-baseline-snapshot   Rebuild the default '${getDefaultSnapshotName()}' snapshot before launch
  -r, --resume-sandbox <name>
                                    Resume existing sandbox by name (ignores dir;
                                    cannot be combined with --refresh-baseline-snapshot)
  -h, --help                        Show this help message
`);
}

function parseArgs(argv: readonly string[]): CliArgs {
	let dir = process.cwd();
	let name: string | undefined;
	let snapshot: string | undefined;
	let refreshBaselineSnapshot = false;
	let resumeSandbox: string | undefined;

	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (!arg) {
			continue;
		}

		if (arg === "-h" || arg === "--help") {
			printUsage();
			process.exit(0);
		}

		if (arg === "-n" || arg === "--name") {
			const value = argv[i + 1];
			if (!value) {
				throw new Error(`${arg} requires a value`);
			}

			name = value;
			i += 1;
			continue;
		}

		if (arg === "--snapshot") {
			const value = argv[i + 1];
			if (!value) {
				throw new Error(`${arg} requires a snapshot name or path`);
			}

			snapshot = value;
			i += 1;
			continue;
		}

		if (arg === "--refresh-baseline-snapshot") {
			refreshBaselineSnapshot = true;
			continue;
		}

		if (arg === "-r" || arg === "--resume-sandbox") {
			const value = argv[i + 1];
			if (!value) {
				throw new Error(`${arg} requires a sandbox name`);
			}

			resumeSandbox = value;
			i += 1;
			continue;
		}

		if (arg.startsWith("-")) {
			throw new Error(`Unknown option: ${arg}`);
		}

		dir = arg;
	}

	const parsed: CliArgs = { dir };
	if (name !== undefined) {
		parsed.name = name;
	}

	if (snapshot !== undefined) {
		parsed.snapshot = snapshot;
	}

	if (refreshBaselineSnapshot) {
		parsed.refreshBaselineSnapshot = true;
	}

	if (resumeSandbox !== undefined) {
		parsed.resumeSandbox = resumeSandbox;
	}

	return parsed;
}

async function main(): Promise<void> {
	const args = parseArgs(process.argv.slice(2));
	const startOptions: StartPiSandboxOptions = {
		workspaceDir: args.dir,
	};

	if (args.name !== undefined) {
		startOptions.name = args.name;
	}

	if (args.snapshot !== undefined) {
		startOptions.snapshot = args.snapshot;
	}

	if (args.refreshBaselineSnapshot) {
		startOptions.refreshBaselineSnapshot = true;
	}

	if (args.resumeSandbox !== undefined) {
		startOptions.resumeSandbox = args.resumeSandbox;
	}

	const { sandbox, sandboxName, resumed, snapshot } =
		await startPiSandbox(startOptions);

	const selectedSnapshot = snapshot ?? getDefaultSnapshotName();

	if (resumed) {
		console.error(`Resumed sandbox '${sandboxName}'. Starting pi...`);
	} else {
		console.error(
			`Created sandbox '${sandboxName}' from snapshot '${selectedSnapshot}'. Starting pi...`,
		);
	}

	const missingPiMessage = resumed
		? "pi-msb: resumed sandbox is missing required tool 'pi'. Resume a sandbox created from a snapshot with pi installed, or start a new sandbox so pi-msb can use/manage the default baseline snapshot."
		: `pi-msb: snapshot '${selectedSnapshot}' is missing required tool 'pi'. ${args.snapshot ? "Provide a snapshot that includes pi, or omit --snapshot to use the auto-managed baseline snapshot." : "Rerun with --refresh-baseline-snapshot to rebuild the default baseline snapshot."}`;

	const launchPiScript = [
		"if ! command -v pi >/dev/null 2>&1; then",
		`  echo ${JSON.stringify(missingPiMessage)} >&2`,
		"  exit 127",
		"fi",
		"exec pi",
	].join("\n");

	const launchEnvironment = buildLaunchEnvironment();

	let exitCode = 1;
	try {
		exitCode = await sandbox.attachWith("bash", (b) => {
			let command = b
				.arg("-lc")
				.arg(launchPiScript)
				.cwd(getSandboxWorkdir())
				.env("PI_MSB_SANDBOX", sandboxName);

			for (const [key, value] of Object.entries(launchEnvironment)) {
				command = command.env(key, value);
			}

			return command;
		});
	} finally {
		if (!args.resumeSandbox) {
			await cleanupSandbox(sandboxName);
		}
	}

	process.exitCode = exitCode;
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(`pi-msb error: ${message}`);
	process.exitCode = 1;
});
