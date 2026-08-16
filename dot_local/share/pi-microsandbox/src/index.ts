import {
	NetworkPolicy,
	Sandbox,
	SandboxNotFoundError,
	SandboxStillRunningError,
	Snapshot,
	SnapshotBuilder,
	type SandboxBuilder,
	type SandboxHandle,
} from "microsandbox";
import { createHash } from "node:crypto";
import {
	constants as fsConstants,
	accessSync,
	existsSync,
	statSync,
} from "node:fs";
import path from "node:path";

export interface PiSandboxDirectory {
	hostPath: string;
	guestPath: string;
	readonly?: boolean;
	noexec?: boolean;
}

export interface CreatePiSandboxOptions {
	name: string;
	workspaceDir: string;
	snapshot?: string;
	extraDirectories?: readonly PiSandboxDirectory[];
	replaceExisting?: boolean;
}

export interface StartPiSandboxOptions {
	workspaceDir: string;
	name?: string;
	snapshot?: string;
	refreshBaselineSnapshot?: boolean;
	resumeSandbox?: string;
	extraDirectories?: readonly PiSandboxDirectory[];
}

export interface StartPiSandboxResult {
	sandbox: Sandbox;
	sandboxName: string;
	resumed: boolean;
	snapshot?: string;
}

const BASELINE_SNAPSHOT_NAME = "pi-msb-baseline";
const BASE_IMAGE = "node:22-bookworm-slim";
const PI_CODING_AGENT_VERSION = "0.79.1";
const DEFAULT_CPUS = 2;
const DEFAULT_MEMORY_MIB = 2048;
const DEFAULT_WORKDIR = "/workspace";
const DEFAULT_USER = "root";
const CLEANUP_KILL_TIMEOUT_MS = 1_500;
const CLEANUP_REMOVE_MAX_ATTEMPTS = 3;
const CLEANUP_REMOVE_RETRY_DELAY_MS = 250;

const PI_CONFIG_HOST_DIRS = [
	{ hostPath: "~/.pi", guestPath: "/root/.pi", readonly: false },
	{ hostPath: "~/.config/pi", guestPath: "/root/.config/pi", readonly: false },
	{
		hostPath: "~/.local/share/pi",
		guestPath: "/root/.local/share/pi",
		readonly: false,
	},
] as const;

const PASSTHROUGH_ENV_KEYS = [
	"OPENAI_API_KEY",
	"ANTHROPIC_API_KEY",
	"GOOGLE_API_KEY",
	"GEMINI_API_KEY",
	"PERPLEXITY_API_KEY",
	"EXA_API_KEY",
	"GITHUB_TOKEN",
	"BRAVE_API_KEY",
	"TAVILY_API_KEY",
	"SERPAPI_API_KEY",
	"XAI_API_KEY",
	"MISTRAL_API_KEY",
	"AWS_ACCESS_KEY_ID",
	"AWS_SECRET_ACCESS_KEY",
	"AWS_SESSION_TOKEN",
	"AWS_REGION",
	"AZURE_OPENAI_API_KEY",
	"AZURE_OPENAI_ENDPOINT",
	"PI_MODEL",
	"PI_HOME",
	"PI_CONFIG",
	"PI_AGENT",
	"PI_SUBAGENTS",
	"NO_PROXY",
	"HTTP_PROXY",
	"HTTPS_PROXY",
	"ALL_PROXY",
	"no_proxy",
	"http_proxy",
	"https_proxy",
	"all_proxy",
] as const;

const SANDBOX_HOST_GATEWAY = "host.microsandbox.internal";
const DEFAULT_NODE_EXTRA_CA_CERTS = "/etc/ssl/certs/ca-certificates.crt";

const PROXY_PASSTHROUGH_ENV_KEYS = [
	"HTTP_PROXY",
	"HTTPS_PROXY",
	"ALL_PROXY",
	"http_proxy",
	"https_proxy",
	"all_proxy",
] as const;

const BOOTSTRAP_PROXY_ENV_KEYS = [
	"HTTP_PROXY",
	"HTTPS_PROXY",
	"ALL_PROXY",
	"http_proxy",
	"https_proxy",
	"all_proxy",
	"NO_PROXY",
	"no_proxy",
] as const;

const PROXY_PASSTHROUGH_ENV_KEY_SET = new Set<string>(
	PROXY_PASSTHROUGH_ENV_KEYS,
);

function isLoopbackHostname(hostname: string): boolean {
	const normalized = hostname.toLowerCase().replace(/^\[(.*)\]$/, "$1");
	return (
		normalized === "localhost" ||
		normalized === "127.0.0.1" ||
		normalized === "::1"
	);
}

function normalizeBareProxyValue(value: string): string {
	const match = value.match(/^(localhost|127\.0\.0\.1|\[::1\]|::1)(:\d+)?$/i);
	if (!match) {
		return value;
	}

	return `${SANDBOX_HOST_GATEWAY}${match[2] ?? ""}`;
}

function normalizeProxyValue(value: string): string {
	try {
		const parsed = new URL(value);
		if (!isLoopbackHostname(parsed.hostname)) {
			return value;
		}

		parsed.hostname = SANDBOX_HOST_GATEWAY;
		return parsed.toString();
	} catch {
		return normalizeBareProxyValue(value);
	}
}

function normalizePassthroughEnvValue(key: string, value: string): string {
	if (!PROXY_PASSTHROUGH_ENV_KEY_SET.has(key)) {
		return value;
	}

	return normalizeProxyValue(value);
}

export function buildLaunchEnvironment(): Record<string, string> {
	const env: Record<string, string> = {
		NODE_EXTRA_CA_CERTS: DEFAULT_NODE_EXTRA_CA_CERTS,
	};

	for (const key of PROXY_PASSTHROUGH_ENV_KEYS) {
		const value = process.env[key];
		if (value) {
			env[key] = normalizeProxyValue(value);
		}
	}

	for (const key of ["NO_PROXY", "no_proxy"] as const) {
		const value = process.env[key];
		if (value) {
			env[key] = value;
		}
	}

	return env;
}

export function getDefaultSnapshotName(): string {
	return BASELINE_SNAPSHOT_NAME;
}

export function defaultSandboxName(workspaceDir: string): string {
	const resolved = resolveHomePath(workspaceDir);
	const base =
		path
			.basename(resolved)
			.toLowerCase()
			.replace(/[^a-z0-9-]+/g, "-")
			.replace(/^-+|-+$/g, "") || "workspace";
	const hash = createHash("sha1").update(resolved).digest("hex").slice(0, 8);
	return `pi-msb-${base}-${hash}`;
}

function resolveHomePath(inputPath: string): string {
	if (inputPath === "~") {
		return getHostHome();
	}

	if (inputPath.startsWith("~/")) {
		return path.join(getHostHome(), inputPath.slice(2));
	}

	return path.resolve(inputPath);
}

function getHostHome(): string {
	const home = process.env.HOME;
	if (!home) {
		throw new Error(
			"HOME is required to build the pi sandbox mount configuration",
		);
	}

	return home;
}

function buildSnapshotMissingError(snapshot: string, error?: unknown): Error {
	const sourceMessage =
		error === undefined
			? ""
			: ` Original error: ${error instanceof Error ? error.message : String(error)}`;

	if (snapshot === BASELINE_SNAPSHOT_NAME) {
		return new Error(
			`Snapshot '${snapshot}' is missing. Omit --snapshot to let pi-msb manage '${BASELINE_SNAPSHOT_NAME}' automatically, or provide an existing snapshot.${sourceMessage}`,
		);
	}

	return new Error(
		`Snapshot '${snapshot}' was not found. Provide an existing snapshot name/path, or omit --snapshot to use auto-managed '${BASELINE_SNAPSHOT_NAME}'.${sourceMessage}`,
	);
}

function buildDefaultSnapshotCreateError(error: unknown): Error {
	const message = error instanceof Error ? error.message : String(error);
	return new Error(
		`Failed to create baseline snapshot '${BASELINE_SNAPSHOT_NAME}'. ${message}`,
	);
}

function isSnapshotMissingError(error: unknown): boolean {
	if (typeof error === "object" && error !== null && "code" in error) {
		const code = String((error as { code?: unknown }).code ?? "");
		if (
			code === "SnapshotNotFound" ||
			code === "NotFound" ||
			code === "NoSuchSnapshot"
		) {
			return true;
		}
	}

	const message = error instanceof Error ? error.message : String(error);
	return (
		/snapshot.*not found/i.test(message) ||
		/no such snapshot/i.test(message) ||
		/snapshot.*missing/i.test(message)
	);
}

function isSnapshotAlreadyExistsError(error: unknown): boolean {
	if (typeof error === "object" && error !== null && "code" in error) {
		const code = String((error as { code?: unknown }).code ?? "");
		if (code === "SnapshotAlreadyExists" || code === "AlreadyExists") {
			return true;
		}
	}

	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("SnapshotAlreadyExists") ||
		/snapshot.*already exists/i.test(message)
	);
}

function buildBaselineSnapshotEnvironment(): Record<string, string> {
	const env: Record<string, string> = {
		HOME: "/root",
		USER: "root",
		LOGNAME: "root",
		SHELL: "/bin/bash",
		TERM: process.env.TERM ?? "xterm-256color",
		LANG: process.env.LANG ?? "C.UTF-8",
		LC_ALL: process.env.LC_ALL ?? "C.UTF-8",
		PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
		DEBIAN_FRONTEND: "noninteractive",
		NODE_EXTRA_CA_CERTS: DEFAULT_NODE_EXTRA_CA_CERTS,
	};

	for (const key of BOOTSTRAP_PROXY_ENV_KEYS) {
		const value = process.env[key];
		if (!value) {
			continue;
		}

		env[key] =
			key === "NO_PROXY" || key === "no_proxy"
				? value
				: normalizeProxyValue(value);
	}

	return env;
}

async function snapshotExists(pathOrName: string): Promise<boolean> {
	try {
		await Snapshot.open(pathOrName);
		return true;
	} catch (error) {
		if (isSnapshotMissingError(error)) {
			return false;
		}

		throw error;
	}
}

async function cleanupBootstrapSandbox(name: string): Promise<void> {
	try {
		const handle = await Sandbox.get(name);
		await handle.killWithTimeout(0);
		await handle.remove();
	} catch {
		// Best-effort cleanup only.
	}
}

async function createDefaultBaselineSnapshot(force: boolean): Promise<void> {
	if (!force) {
		const exists = await snapshotExists(BASELINE_SNAPSHOT_NAME);
		if (exists) {
			return;
		}
	}

	console.error(
		`pi-msb: ${force ? "refreshing" : "creating"} baseline snapshot '${BASELINE_SNAPSHOT_NAME}' from ${BASE_IMAGE}...`,
	);

	const bootstrapSandboxName = `pi-msb-bootstrap-${Date.now()}-${process.pid}`;
	const installScript = [
		"set -euo pipefail",
		"apt-get update",
		"apt-get install -y --no-install-recommends ca-certificates curl fd-find git python3 ripgrep",
		`npm install --global --ignore-scripts "@earendil-works/pi-coding-agent@${PI_CODING_AGENT_VERSION}"`,
		"command -v pi >/dev/null 2>&1",
		'ln -sf "$(command -v fdfind)" /usr/local/bin/fd',
		"command -v fd >/dev/null 2>&1",
		"command -v rg >/dev/null 2>&1",
		"curl -LsSf https://astral.sh/uv/install.sh | env UV_INSTALL_DIR=/usr/local/bin sh",
		"command -v uv >/dev/null 2>&1",
		"command -v uvx >/dev/null 2>&1",
		"npm cache clean --force",
		"rm -rf /var/lib/apt/lists/*",
	].join("\n");

	try {
		const sandbox = await Sandbox.builder(bootstrapSandboxName)
			.image(BASE_IMAGE)
			.cpus(DEFAULT_CPUS)
			.memory(DEFAULT_MEMORY_MIB)
			.user(DEFAULT_USER)
			.workdir("/root")
			.shell("/bin/bash")
			.detached(true)
			.envs(buildBaselineSnapshotEnvironment())
			.network((n) =>
				n.enabled(true).policy(NetworkPolicy.allowAll()).trustHostCAs(true),
			)
			.create();

		const output = await sandbox.exec("bash", ["-lc", installScript]);
		if (!output.success) {
			process.stderr.write(output.stderr());
			throw new Error(`Bootstrap install failed with exit code ${output.code}`);
		}

		await sandbox.stop();

		const snapshotBuilder = new SnapshotBuilder(bootstrapSandboxName).name(
			BASELINE_SNAPSHOT_NAME,
		);
		if (force) {
			snapshotBuilder.force();
		}

		try {
			await snapshotBuilder.create();
		} catch (error) {
			if (!(isSnapshotAlreadyExistsError(error) && !force)) {
				throw error;
			}
		}

		console.error(
			`pi-msb: baseline snapshot '${BASELINE_SNAPSHOT_NAME}' is ready.`,
		);
	} finally {
		await cleanupBootstrapSandbox(bootstrapSandboxName);
	}
}

async function ensureSnapshotReady(
	snapshot: string,
	options: {
		allowDefaultAutoCreate: boolean;
		refreshDefaultSnapshot: boolean;
	},
): Promise<void> {
	if (options.refreshDefaultSnapshot && snapshot !== BASELINE_SNAPSHOT_NAME) {
		throw new Error(
			"--refresh-baseline-snapshot can only be used with the default baseline snapshot",
		);
	}

	if (options.refreshDefaultSnapshot) {
		try {
			await createDefaultBaselineSnapshot(true);
		} catch (createError) {
			throw buildDefaultSnapshotCreateError(createError);
		}

		try {
			await Snapshot.open(snapshot);
		} catch (verifyError) {
			if (isSnapshotMissingError(verifyError)) {
				throw buildSnapshotMissingError(snapshot, verifyError);
			}

			throw verifyError;
		}

		return;
	}

	try {
		await Snapshot.open(snapshot);
		return;
	} catch (error) {
		if (!isSnapshotMissingError(error)) {
			throw error;
		}

		if (
			!options.allowDefaultAutoCreate ||
			snapshot !== BASELINE_SNAPSHOT_NAME
		) {
			throw buildSnapshotMissingError(snapshot, error);
		}

		try {
			await createDefaultBaselineSnapshot(false);
		} catch (createError) {
			throw buildDefaultSnapshotCreateError(createError);
		}

		try {
			await Snapshot.open(snapshot);
		} catch (verifyError) {
			if (isSnapshotMissingError(verifyError)) {
				throw buildSnapshotMissingError(snapshot, verifyError);
			}

			throw verifyError;
		}

		return;
	}
}

function buildDefaultEnvironment(): Record<string, string> {
	const env: Record<string, string> = {
		HOME: "/root",
		USER: "root",
		LOGNAME: "root",
		SHELL: "/bin/bash",
		TERM: process.env.TERM ?? "xterm-256color",
		LANG: process.env.LANG ?? "C.UTF-8",
		LC_ALL: process.env.LC_ALL ?? "C.UTF-8",
		PATH:
			process.env.PATH ??
			"/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin",
		PI_SANDBOX: "1",
		PI_SANDBOX_NETWORK: "host-allowed",
		PI_SANDBOX_HOST_GATEWAY: SANDBOX_HOST_GATEWAY,
		PI_SANDBOX_RUNTIME: "microsandbox",
		NODE_EXTRA_CA_CERTS: DEFAULT_NODE_EXTRA_CA_CERTS,
	};

	for (const key of PASSTHROUGH_ENV_KEYS) {
		const value = process.env[key];
		if (value) {
			env[key] = normalizePassthroughEnvValue(key, value);
		}
	}

	return env;
}

function ensureDirectoryExists(directoryPath: string, label: string): void {
	if (!existsSync(directoryPath)) {
		throw new Error(`${label} does not exist: ${directoryPath}`);
	}

	const stat = statSync(directoryPath);
	if (!stat.isDirectory()) {
		throw new Error(`${label} is not a directory: ${directoryPath}`);
	}
}

function assertKvmAccess(): void {
	const kvmPath = "/dev/kvm";
	if (!existsSync(kvmPath)) {
		throw new Error(
			`${kvmPath} is required for pi-msb. Enable KVM virtualization support on the host, then try again.`,
		);
	}

	try {
		accessSync(kvmPath, fsConstants.R_OK | fsConstants.W_OK);
	} catch {
		throw new Error(
			`${kvmPath} is not accessible by the current user. pi-msb requires KVM access; add your user to the 'kvm' group (for example: sudo usermod -aG kvm $USER) and start a new login session before retrying.`,
		);
	}
}

function withBindMount(
	builder: SandboxBuilder,
	mount: PiSandboxDirectory,
): SandboxBuilder {
	const hostPath = resolveHomePath(mount.hostPath);
	if (!existsSync(hostPath)) {
		return builder;
	}

	return builder.volume(mount.guestPath, (m) => {
		let volume = m.bind(hostPath);
		if (mount.readonly) {
			volume = volume.readonly();
		}

		if (mount.noexec) {
			volume = volume.noexec();
		}

		return volume;
	});
}

export async function createPiSandbox(
	options: CreatePiSandboxOptions,
): Promise<Sandbox> {
	if (!options.name.trim()) {
		throw new Error("Sandbox name is required");
	}

	const workspaceDir = resolveHomePath(options.workspaceDir);
	ensureDirectoryExists(workspaceDir, "Workspace directory");

	let builder = Sandbox.builder(options.name)
		.fromSnapshot(options.snapshot ?? BASELINE_SNAPSHOT_NAME)
		.cpus(DEFAULT_CPUS)
		.memory(DEFAULT_MEMORY_MIB)
		.user(DEFAULT_USER)
		.workdir(DEFAULT_WORKDIR)
		.shell("/bin/bash")
		.detached(true)
		.envs(buildDefaultEnvironment())
		.network((n) =>
			n.enabled(true).policy(NetworkPolicy.allowAll()).trustHostCAs(true),
		);

	if (options.replaceExisting) {
		builder = builder.replace();
	}

	builder = withBindMount(builder, {
		hostPath: workspaceDir,
		guestPath: DEFAULT_WORKDIR,
		readonly: false,
	});

	for (const mount of PI_CONFIG_HOST_DIRS) {
		builder = withBindMount(builder, mount);
	}

	for (const mount of options.extraDirectories ?? []) {
		builder = withBindMount(builder, mount);
	}

	return builder.create();
}

async function connectOrStartSandbox(name: string): Promise<Sandbox> {
	const handle = await Sandbox.get(name);
	try {
		return await handle.connectWithTimeout(2_000);
	} catch {
		return handle.startDetached();
	}
}

async function recreatePiSandbox(
	options: CreatePiSandboxOptions,
): Promise<Sandbox> {
	await cleanupSandbox(options.name);
	return createPiSandbox({ ...options, replaceExisting: true });
}

function isSandboxAlreadyExistsError(error: unknown): boolean {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "SandboxAlreadyExists"
	) {
		return true;
	}

	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("SandboxAlreadyExists") ||
		/sandbox.*already exists/i.test(message)
	);
}

function isBootStartLikeError(error: unknown): boolean {
	if (
		typeof error === "object" &&
		error !== null &&
		"code" in error &&
		(error as { code?: unknown }).code === "BootStart"
	) {
		return true;
	}

	const message = error instanceof Error ? error.message : String(error);
	return (
		message.includes("BootStart") ||
		(/failed to start/i.test(message) && /agent relay/i.test(message)) ||
		/sandbox process exited.*SIGABRT/i.test(message)
	);
}

function isSandboxGoneError(error: unknown): boolean {
	if (error instanceof SandboxNotFoundError) {
		return true;
	}

	if (typeof error === "object" && error !== null && "code" in error) {
		const code = String((error as { code?: unknown }).code ?? "");
		if (
			code === "SandboxNotFound" ||
			code === "NotFound" ||
			code === "sandboxNotFound"
		) {
			return true;
		}
	}

	const message = error instanceof Error ? error.message : String(error);
	return (
		/sandbox.*not found/i.test(message) || /no such sandbox/i.test(message)
	);
}

function isSandboxStillRunningError(error: unknown): boolean {
	if (error instanceof SandboxStillRunningError) {
		return true;
	}

	if (typeof error === "object" && error !== null && "code" in error) {
		const code = String((error as { code?: unknown }).code ?? "");
		if (code === "SandboxStillRunning" || code === "sandboxStillRunning") {
			return true;
		}
	}

	const message = error instanceof Error ? error.message : String(error);
	return /sandbox.*still running/i.test(message);
}

function isStopObservationTimeoutError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return /timed out observing stopped state/i.test(message);
}

function delay(ms: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function removeSandboxWithRetry(handle: SandboxHandle): Promise<void> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= CLEANUP_REMOVE_MAX_ATTEMPTS; attempt += 1) {
		try {
			await handle.remove();
			return;
		} catch (error) {
			if (isSandboxGoneError(error)) {
				return;
			}

			lastError = error;
			if (
				!isSandboxStillRunningError(error) ||
				attempt === CLEANUP_REMOVE_MAX_ATTEMPTS
			) {
				throw error;
			}

			await delay(CLEANUP_REMOVE_RETRY_DELAY_MS);
		}
	}

	if (lastError !== undefined) {
		throw lastError;
	}
}

export async function startPiSandbox(
	options: StartPiSandboxOptions,
): Promise<StartPiSandboxResult> {
	const workspaceDir = resolveHomePath(options.workspaceDir);
	const requestedSnapshot = options.snapshot?.trim();
	const refreshBaselineSnapshot = options.refreshBaselineSnapshot === true;

	if (options.snapshot !== undefined && !requestedSnapshot) {
		throw new Error("--snapshot requires a non-empty snapshot name or path");
	}

	if (refreshBaselineSnapshot && options.snapshot !== undefined) {
		throw new Error(
			"--refresh-baseline-snapshot cannot be combined with --snapshot",
		);
	}

	if (refreshBaselineSnapshot && options.resumeSandbox) {
		throw new Error(
			"--refresh-baseline-snapshot cannot be combined with --resume-sandbox",
		);
	}

	if (options.resumeSandbox) {
		const sandbox = await connectOrStartSandbox(options.resumeSandbox);
		return {
			sandbox,
			sandboxName: options.resumeSandbox,
			resumed: true,
		};
	}

	ensureDirectoryExists(workspaceDir, "Workspace directory");
	assertKvmAccess();

	const snapshot = requestedSnapshot ?? BASELINE_SNAPSHOT_NAME;
	await ensureSnapshotReady(snapshot, {
		allowDefaultAutoCreate: options.snapshot === undefined,
		refreshDefaultSnapshot: refreshBaselineSnapshot,
	});

	const sandboxName = options.name?.trim() || defaultSandboxName(workspaceDir);
	const createOptions: CreatePiSandboxOptions = {
		name: sandboxName,
		workspaceDir,
		snapshot,
	};

	if (options.extraDirectories !== undefined) {
		createOptions.extraDirectories = options.extraDirectories;
	}

	try {
		const sandbox = await createPiSandbox(createOptions);
		return {
			sandbox,
			sandboxName,
			resumed: false,
			snapshot,
		};
	} catch (error) {
		if (isSnapshotMissingError(error)) {
			throw buildSnapshotMissingError(snapshot, error);
		}

		if (isBootStartLikeError(error)) {
			try {
				const sandbox = await recreatePiSandbox(createOptions);
				return {
					sandbox,
					sandboxName,
					resumed: false,
					snapshot,
				};
			} catch (recreateError) {
				if (isSnapshotMissingError(recreateError)) {
					throw buildSnapshotMissingError(snapshot, recreateError);
				}

				throw recreateError;
			}
		}

		if (!isSandboxAlreadyExistsError(error)) {
			throw error;
		}

		try {
			const sandbox = await connectOrStartSandbox(sandboxName);
			return {
				sandbox,
				sandboxName,
				resumed: true,
				snapshot,
			};
		} catch (startError) {
			if (isSnapshotMissingError(startError)) {
				throw buildSnapshotMissingError(snapshot, startError);
			}

			if (!isBootStartLikeError(startError)) {
				throw startError;
			}

			try {
				const sandbox = await recreatePiSandbox(createOptions);
				return {
					sandbox,
					sandboxName,
					resumed: false,
					snapshot,
				};
			} catch (recreateError) {
				if (isSnapshotMissingError(recreateError)) {
					throw buildSnapshotMissingError(snapshot, recreateError);
				}

				throw recreateError;
			}
		}
	}
}

export async function cleanupSandbox(name: string): Promise<void> {
	const warnCleanupFailure = (error: unknown): void => {
		const message = error instanceof Error ? error.message : String(error);
		console.warn(
			`pi-msb: failed to remove disposable sandbox '${name}': ${message}`,
		);
	};

	let handle: SandboxHandle;
	try {
		handle = await Sandbox.get(name);
	} catch (error) {
		if (isSandboxGoneError(error)) {
			return;
		}

		warnCleanupFailure(error);
		return;
	}

	try {
		await handle.killWithTimeout(CLEANUP_KILL_TIMEOUT_MS);
	} catch (error) {
		if (isSandboxGoneError(error)) {
			return;
		}

		if (!isStopObservationTimeoutError(error)) {
			warnCleanupFailure(error);
			return;
		}

		try {
			await handle.requestKill();
		} catch (requestKillError) {
			if (isSandboxGoneError(requestKillError)) {
				return;
			}
		}
	}

	try {
		await removeSandboxWithRetry(handle);
	} catch (error) {
		warnCleanupFailure(error);
	}
}

export function getSandboxWorkdir(): string {
	return DEFAULT_WORKDIR;
}
