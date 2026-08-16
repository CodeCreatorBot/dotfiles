// @ts-nocheck

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import {
	createEditTool,
	createLsTool,
	createReadTool,
	createWriteTool,
} from "@earendil-works/pi-coding-agent";
import { constants } from "node:fs";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";

type ToolBundle = {
	read: ReturnType<typeof createReadTool>;
	write: ReturnType<typeof createWriteTool>;
	edit: ReturnType<typeof createEditTool>;
	ls: ReturnType<typeof createLsTool>;
};

type IgnoreRule = {
	negated: boolean;
	directoryOnly: boolean;
	basenameOnly: boolean;
	regex: RegExp;
};

const toolCache = new Map<string, ToolBundle>();
const gitRootCache = new Map<string, string | null>();
const gitIgnoredPathCache = new Map<string, boolean>();
const gitIgnoredChildrenCache = new Map<string, Set<string>>();
const piIgnoreRulesCache = new Map<string, IgnoreRule[]>();
const piIgnoredPathCache = new Map<string, boolean>();

function toGitPath(path: string): string {
	return path.split(sep).join("/");
}

function ignoredCacheKey(root: string, relativePath: string): string {
	return `${root}\0${relativePath}`;
}

async function pathExists(path: string): Promise<boolean> {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

async function findGitRoot(
	pi: ExtensionAPI,
	absolutePath: string,
): Promise<string | null> {
	const candidates = [absolutePath, dirname(absolutePath)];

	for (const candidate of candidates) {
		if (gitRootCache.has(candidate)) {
			const cached = gitRootCache.get(candidate);
			if (cached) {
				return cached;
			}
			continue;
		}

		const result = await pi.exec(
			"git",
			["-C", candidate, "rev-parse", "--show-toplevel"],
			{
				timeout: 3000,
			},
		);

		if (result.code === 0) {
			const root = result.stdout.trim();
			gitRootCache.set(candidate, root);
			return root;
		}

		gitRootCache.set(candidate, null);
	}

	return null;
}

async function getRepoPathInfo(
	pi: ExtensionAPI,
	absolutePath: string,
): Promise<{ root: string | null; relativePath: string | null }> {
	const root = await findGitRoot(pi, absolutePath);
	if (!root) {
		return { root: null, relativePath: null };
	}

	const repoRelativePath = toGitPath(relative(root, absolutePath));
	if (!repoRelativePath || repoRelativePath === "") {
		return { root, relativePath: "." };
	}

	if (repoRelativePath === ".." || repoRelativePath.startsWith("../")) {
		return { root: null, relativePath: null };
	}

	return { root, relativePath: repoRelativePath };
}

async function isGitIgnoredInRepo(
	pi: ExtensionAPI,
	root: string,
	absolutePath: string,
): Promise<boolean> {
	const relativePath = toGitPath(relative(root, absolutePath));
	if (!relativePath || relativePath === ".") {
		return false;
	}

	if (relativePath === ".." || relativePath.startsWith("../")) {
		return false;
	}

	const cacheKey = ignoredCacheKey(root, relativePath);
	const cached = gitIgnoredPathCache.get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	const result = await pi.exec(
		"git",
		["-C", root, "check-ignore", "--quiet", "--", relativePath],
		{
			timeout: 3000,
		},
	);
	const ignored = result.code === 0;

	gitIgnoredPathCache.set(cacheKey, ignored);
	return ignored;
}

function globToRegexSource(pattern: string): string {
	let source = "";

	for (let index = 0; index < pattern.length; index += 1) {
		if (pattern.startsWith("**/", index)) {
			source += "(?:.*/)?";
			index += 2;
			continue;
		}

		if (pattern.startsWith("/**", index)) {
			source += "(?:/.*)?";
			index += 2;
			continue;
		}

		const char = pattern[index];
		if (char === "*") {
			if (pattern[index + 1] === "*") {
				source += ".*";
				index += 1;
				continue;
			}

			source += "[^/]*";
			continue;
		}

		if (char === "?") {
			source += "[^/]";
			continue;
		}

		source += char.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&");
	}

	return source;
}

function parseIgnoreRules(content: string): IgnoreRule[] {
	const rules: IgnoreRule[] = [];

	for (const rawLine of content.split(/\r?\n/)) {
		let line = rawLine.trim();
		if (!line) {
			continue;
		}

		if (line.startsWith("\\#")) {
			line = line.slice(1);
		} else if (line.startsWith("#")) {
			continue;
		}

		let negated = false;
		if (line.startsWith("\\!")) {
			line = line.slice(1);
		} else if (line.startsWith("!")) {
			negated = true;
			line = line.slice(1).trim();
		}

		if (!line) {
			continue;
		}

		const directoryOnly = line.endsWith("/");
		if (directoryOnly) {
			line = line.slice(0, -1);
		}

		if (line.startsWith("/")) {
			line = line.slice(1);
		}

		if (!line) {
			continue;
		}

		rules.push({
			negated,
			directoryOnly,
			basenameOnly: !line.includes("/"),
			regex: new RegExp(`^${globToRegexSource(line)}$`),
		});
	}

	return rules;
}

async function getPiIgnoreRules(root: string): Promise<IgnoreRule[]> {
	const cached = piIgnoreRulesCache.get(root);
	if (cached) {
		return cached;
	}

	const ignoreFilePath = resolve(root, ".pi", ".ignore");
	if (!(await pathExists(ignoreFilePath))) {
		piIgnoreRulesCache.set(root, []);
		return [];
	}

	const content = await readFile(ignoreFilePath, "utf8");
	const rules = parseIgnoreRules(content);
	piIgnoreRulesCache.set(root, rules);
	return rules;
}

function matchesDirectoryPathRule(
	regex: RegExp,
	relativePath: string,
	isDirectory: boolean,
): boolean {
	const segments = relativePath.split("/").filter(Boolean);
	let currentPath = "";
	const limit = isDirectory
		? segments.length
		: Math.max(segments.length - 1, 0);

	for (let index = 0; index < limit; index += 1) {
		currentPath = currentPath
			? `${currentPath}/${segments[index]}`
			: segments[index];
		if (regex.test(currentPath)) {
			return true;
		}
	}

	return false;
}

function matchesBasenameDirectoryRule(
	regex: RegExp,
	relativePath: string,
	isDirectory: boolean,
): boolean {
	const segments = relativePath.split("/").filter(Boolean);
	const limit = isDirectory
		? segments.length
		: Math.max(segments.length - 1, 0);

	for (let index = 0; index < limit; index += 1) {
		if (regex.test(segments[index])) {
			return true;
		}
	}

	return false;
}

async function isPiIgnoredInRepo(
	root: string,
	absolutePath: string,
): Promise<boolean> {
	const relativePath = toGitPath(relative(root, absolutePath));
	if (!relativePath || relativePath === ".") {
		return false;
	}

	if (relativePath === ".." || relativePath.startsWith("../")) {
		return false;
	}

	const cacheKey = ignoredCacheKey(root, relativePath);
	const cached = piIgnoredPathCache.get(cacheKey);
	if (cached !== undefined) {
		return cached;
	}

	const rules = await getPiIgnoreRules(root);
	if (rules.length === 0) {
		piIgnoredPathCache.set(cacheKey, false);
		return false;
	}

	let isDirectory = false;
	try {
		const pathStat = await stat(absolutePath);
		isDirectory = pathStat.isDirectory();
	} catch {
		isDirectory = false;
	}

	let ignored = false;
	const segments = relativePath.split("/").filter(Boolean);

	for (const rule of rules) {
		let matches = false;

		if (rule.basenameOnly) {
			if (rule.directoryOnly) {
				matches = matchesBasenameDirectoryRule(
					rule.regex,
					relativePath,
					isDirectory,
				);
			} else {
				matches = segments.some((segment) => rule.regex.test(segment));
			}
		} else if (rule.directoryOnly) {
			matches = matchesDirectoryPathRule(rule.regex, relativePath, isDirectory);
		} else {
			matches = rule.regex.test(relativePath);
		}

		if (matches) {
			ignored = !rule.negated;
		}
	}

	piIgnoredPathCache.set(cacheKey, ignored);
	return ignored;
}

async function isIgnoredInRepo(
	pi: ExtensionAPI,
	root: string,
	absolutePath: string,
): Promise<boolean> {
	if (await isGitIgnoredInRepo(pi, root, absolutePath)) {
		return true;
	}

	return isPiIgnoredInRepo(root, absolutePath);
}

async function isIgnored(
	pi: ExtensionAPI,
	absolutePath: string,
): Promise<boolean> {
	const { root } = await getRepoPathInfo(pi, absolutePath);
	if (!root) {
		return false;
	}

	return isIgnoredInRepo(pi, root, absolutePath);
}

async function getGitIgnoredChildNames(
	pi: ExtensionAPI,
	directoryPath: string,
): Promise<Set<string>> {
	const { root, relativePath } = await getRepoPathInfo(pi, directoryPath);
	if (!root || !relativePath) {
		return new Set();
	}

	const cacheKey = ignoredCacheKey(root, relativePath);
	const cached = gitIgnoredChildrenCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const args = [
		"-C",
		root,
		"ls-files",
		"--others",
		"--ignored",
		"--exclude-standard",
		"--directory",
		"--no-empty-directory",
		"--",
	];

	if (relativePath !== ".") {
		args.push(relativePath);
	}

	const result = await pi.exec("git", args, { timeout: 5000 });
	if (result.code !== 0) {
		return new Set();
	}

	const prefix = relativePath === "." ? "" : `${relativePath}/`;
	const ignoredChildren = new Set<string>();

	for (const rawLine of result.stdout.split("\n")) {
		const trimmed = rawLine.trim();
		if (!trimmed) {
			continue;
		}

		const normalized = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
		const relativeToDirectory = prefix
			? normalized.slice(prefix.length)
			: normalized;
		if (!relativeToDirectory || relativeToDirectory.startsWith("../")) {
			continue;
		}

		const firstSegment = relativeToDirectory.split("/")[0];
		if (firstSegment) {
			ignoredChildren.add(firstSegment);
		}
	}

	gitIgnoredChildrenCache.set(cacheKey, ignoredChildren);
	return ignoredChildren;
}

async function filterVisibleEntries(
	pi: ExtensionAPI,
	directoryPath: string,
	entries: string[],
): Promise<string[]> {
	if (entries.length === 0) {
		return entries;
	}

	const { root } = await getRepoPathInfo(pi, directoryPath);
	if (!root) {
		return entries;
	}

	const gitIgnoredChildren = await getGitIgnoredChildNames(pi, directoryPath);
	const visibleEntries: string[] = [];

	for (const entry of entries) {
		if (gitIgnoredChildren.has(entry)) {
			continue;
		}

		const absolutePath = resolve(directoryPath, entry);
		if (await isPiIgnoredInRepo(root, absolutePath)) {
			continue;
		}

		visibleEntries.push(entry);
	}

	return visibleEntries;
}

function isLikelyPathToken(token: string): boolean {
	if (!token) {
		return false;
	}

	if (
		token === "." ||
		token === ".." ||
		token.startsWith("./") ||
		token.startsWith("../") ||
		token.startsWith("/") ||
		token.startsWith("~/") ||
		token.startsWith(".") ||
		token.includes("/")
	) {
		return true;
	}

	return false;
}

function stripShellQuotes(token: string): string {
	if (token.length < 2) {
		return token;
	}

	const first = token[0];
	const last = token[token.length - 1];
	if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
		return token.slice(1, -1);
	}

	return token;
}

function normalizeShellPathToken(token: string): string | null {
	const stripped = stripShellQuotes(token.trim());
	if (!stripped) {
		return null;
	}

	if (
		stripped.startsWith("-") ||
		stripped.includes("://") ||
		stripped.includes("$") ||
		stripped.includes("`") ||
		stripped.includes("*(") ||
		stripped.includes("<(") ||
		stripped.includes(">(")
	) {
		return null;
	}

	if (!isLikelyPathToken(stripped)) {
		return null;
	}

	return stripped;
}

function extractLikelyShellPaths(command: string): string[] {
	const tokenPattern = /'[^']*'|"(?:\\.|[^"])*"|\S+/g;
	const tokens = command.match(tokenPattern) ?? [];
	const redirectionPattern = /^(?:\d*)(?:>>?|<<?|<>|&>>?)(.*)$/;
	const candidates = new Set<string>();
	let expectRedirectTarget = false;

	for (const token of tokens) {
		if (expectRedirectTarget) {
			expectRedirectTarget = false;
			const candidate = normalizeShellPathToken(token);
			if (candidate) {
				candidates.add(candidate);
			}
			continue;
		}

		const redirectionMatch = token.match(redirectionPattern);
		if (redirectionMatch) {
			const inlineTarget = normalizeShellPathToken(redirectionMatch[1] ?? "");
			if (inlineTarget) {
				candidates.add(inlineTarget);
			} else if ((redirectionMatch[1] ?? "") === "") {
				expectRedirectTarget = true;
			}
			continue;
		}

		const candidate = normalizeShellPathToken(token);
		if (candidate) {
			candidates.add(candidate);
		}
	}

	return [...candidates];
}

function resolveShellPath(cwd: string, candidate: string): string {
	if (candidate === "~") {
		return homedir();
	}

	if (candidate.startsWith("~/")) {
		return resolve(homedir(), candidate.slice(2));
	}

	return resolve(cwd, candidate);
}

function blockedPathError(
	action: "read" | "write" | "edit" | "ls" | "bash",
	path: string,
): Error {
	return new Error(`pi-ignore blocked ${action} on ignored path: ${path}`);
}

function createTools(pi: ExtensionAPI, cwd: string): ToolBundle {
	return {
		read: createReadTool(cwd),
		write: createWriteTool(cwd),
		edit: createEditTool(cwd),
		ls: createLsTool(cwd, {
			operations: {
				exists: pathExists,
				stat,
				async readdir(absolutePath) {
					const entries = await readdir(absolutePath);
					return filterVisibleEntries(pi, absolutePath, entries);
				},
			},
		}),
	};
}

function getTools(pi: ExtensionAPI, cwd: string): ToolBundle {
	let tools = toolCache.get(cwd);
	if (!tools) {
		tools = createTools(pi, cwd);
		toolCache.set(cwd, tools);
	}
	return tools;
}

function clearCaches(): void {
	gitIgnoredPathCache.clear();
	gitIgnoredChildrenCache.clear();
	piIgnoreRulesCache.clear();
	piIgnoredPathCache.clear();
}

export default function piIgnore(pi: ExtensionAPI) {
	const initialTools = getTools(pi, process.cwd());

	pi.on("session_start", async () => {
		clearCaches();
	});

	pi.on("turn_start", async () => {
		clearCaches();
	});

	pi.on("before_agent_start", async (event, ctx) => {
		const root = await findGitRoot(pi, ctx.cwd);
		if (!root) {
			return undefined;
		}

		return {
			systemPrompt:
				`${event.systemPrompt}\n\n` +
				"pi-ignore is active for this repository. Treat gitignored files, directories, and paths matched by .pi/.ignore as unavailable. " +
				"The read, write, edit, and ls tools will hide or block ignored paths. " +
				"bash is also guarded with a best-effort preflight that blocks obvious explicit paths and redirection targets when they are ignored. " +
				"Prefer tracked or otherwise unignored files. find and grep already follow gitignore through fd and ripgrep.",
		};
	});

	pi.on("tool_call", async (event, ctx) => {
		if (event.toolName !== "bash") {
			return undefined;
		}

		const root = await findGitRoot(pi, ctx.cwd);
		if (!root) {
			return undefined;
		}

		const command = String(event.input.command ?? "");
		const candidates = extractLikelyShellPaths(command);
		for (const candidate of candidates) {
			const absolutePath = resolveShellPath(ctx.cwd, candidate);
			if (await isIgnoredInRepo(pi, root, absolutePath)) {
				return {
					block: true,
					reason: blockedPathError("bash", candidate).message,
				};
			}
		}

		return undefined;
	});

	pi.registerTool({
		name: "read",
		label: "read",
		description: initialTools.read.description,
		parameters: initialTools.read.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const absolutePath = resolve(ctx.cwd, params.path);
			if (await isIgnored(pi, absolutePath)) {
				throw blockedPathError("read", params.path);
			}

			return getTools(pi, ctx.cwd).read.execute(
				toolCallId,
				params,
				signal,
				onUpdate,
			);
		},
	});

	pi.registerTool({
		name: "write",
		label: "write",
		description: initialTools.write.description,
		parameters: initialTools.write.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const absolutePath = resolve(ctx.cwd, params.path);
			if (await isIgnored(pi, absolutePath)) {
				throw blockedPathError("write", params.path);
			}

			return getTools(pi, ctx.cwd).write.execute(
				toolCallId,
				params,
				signal,
				onUpdate,
			);
		},
	});

	pi.registerTool({
		name: "edit",
		label: "edit",
		description: initialTools.edit.description,
		parameters: initialTools.edit.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const absolutePath = resolve(ctx.cwd, params.path);
			if (await isIgnored(pi, absolutePath)) {
				throw blockedPathError("edit", params.path);
			}

			return getTools(pi, ctx.cwd).edit.execute(
				toolCallId,
				params,
				signal,
				onUpdate,
			);
		},
	});

	pi.registerTool({
		name: "ls",
		label: "ls",
		description: initialTools.ls.description,
		parameters: initialTools.ls.parameters,
		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const absolutePath = resolve(ctx.cwd, params.path ?? ".");
			if (await isIgnored(pi, absolutePath)) {
				throw blockedPathError("ls", params.path ?? ".");
			}

			return getTools(pi, ctx.cwd).ls.execute(
				toolCallId,
				params,
				signal,
				onUpdate,
			);
		},
	});
}
