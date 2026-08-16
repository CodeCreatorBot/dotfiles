import { homedir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";

const gitRootCache = new Map<string, string | null>();
const gitIgnoredCache = new Map<string, boolean>();

function toGitPath(path: string): string {
  return path.split(sep).join("/");
}

function cacheKey(root: string, relativePath: string): string {
  return `${root}\0${relativePath}`;
}

async function findGitRoot(
  $: any,
  absolutePath: string,
): Promise<string | null> {
  const candidates = [absolutePath, dirname(absolutePath)];

  for (const candidate of candidates) {
    if (gitRootCache.has(candidate)) {
      return gitRootCache.get(candidate) ?? null;
    }

    try {
      const result =
        await $`git -C ${candidate} rev-parse --show-toplevel`.quiet();
      const root = result.text().trim();
      gitRootCache.set(candidate, root);
      return root;
    } catch {
      gitRootCache.set(candidate, null);
    }
  }

  return null;
}

async function isGitIgnored(
  $: any,
  root: string,
  absolutePath: string,
): Promise<boolean> {
  const relativePath = toGitPath(relative(root, absolutePath));
  if (
    !relativePath ||
    relativePath === "." ||
    relativePath === ".." ||
    relativePath.startsWith("../")
  ) {
    return false;
  }

  const key = cacheKey(root, relativePath);
  const cached = gitIgnoredCache.get(key);
  if (cached !== undefined) {
    return cached;
  }

  try {
    await $`git -C ${root} check-ignore --quiet -- ${relativePath}`.quiet();
    gitIgnoredCache.set(key, true);
    return true;
  } catch {
    gitIgnoredCache.set(key, false);
    return false;
  }
}

async function isIgnored(
  $: any,
  cwd: string,
  pathValue: string,
): Promise<boolean> {
  const absolutePath =
    pathValue === "~"
      ? homedir()
      : pathValue.startsWith("~/")
        ? resolve(homedir(), pathValue.slice(2))
        : resolve(cwd, pathValue);
  const root = await findGitRoot($, absolutePath);
  if (!root) {
    return false;
  }

  return isGitIgnored($, root, absolutePath);
}

function shellTokens(command: string): string[] {
  return command.match(/'[^']*'|"(?:\\.|[^"])*"|\S+/g) ?? [];
}

function stripQuotes(token: string): string {
  if (token.length >= 2) {
    const first = token[0];
    const last = token[token.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return token.slice(1, -1);
    }
  }

  return token;
}

function normalizeCandidate(token: string): string | null {
  const value = stripQuotes(token.trim());
  if (!value) {
    return null;
  }

  if (
    value.startsWith("-") ||
    value.includes("://") ||
    value.includes("$") ||
    value.includes("`") ||
    value.includes("*(") ||
    value.includes("<(") ||
    value.includes(">(")
  ) {
    return null;
  }

  if (
    value === "." ||
    value === ".." ||
    value.startsWith("./") ||
    value.startsWith("../") ||
    value.startsWith("/") ||
    value.startsWith("~/") ||
    value.startsWith(".") ||
    value.includes("/")
  ) {
    return value;
  }

  return null;
}

function extractPathCandidates(command: string): string[] {
  const tokens = shellTokens(command);
  const redirectionPattern = /^(?:\d*)(?:>>?|<<?|<>|&>>?)(.*)$/;
  const results = new Set<string>();
  let expectRedirectTarget = false;

  for (const token of tokens) {
    if (expectRedirectTarget) {
      expectRedirectTarget = false;
      const candidate = normalizeCandidate(token);
      if (candidate) {
        results.add(candidate);
      }
      continue;
    }

    const redirectionMatch = token.match(redirectionPattern);
    if (redirectionMatch) {
      const inlineTarget = normalizeCandidate(redirectionMatch[1] ?? "");
      if (inlineTarget) {
        results.add(inlineTarget);
      } else if ((redirectionMatch[1] ?? "") === "") {
        expectRedirectTarget = true;
      }
      continue;
    }

    const candidate = normalizeCandidate(token);
    if (candidate) {
      results.add(candidate);
    }
  }

  return [...results];
}

function block(action: string, pathValue: string): never {
  throw new Error(
    `ignored-path-guard blocked ${action} on gitignored path: ${pathValue}`,
  );
}

function getToolPath(args: Record<string, unknown>): string {
  const pathValue = args.filePath ?? args.path;
  return typeof pathValue === "string" ? pathValue : "";
}

export default async ({ $ }) => {
  return {
    event: async ({ event }) => {
      if (
        event.type === "session.created" ||
        event.type === "session.deleted"
      ) {
        gitRootCache.clear();
        gitIgnoredCache.clear();
      }
    },
    "tool.execute.before": async (input, output) => {
      const cwd = typeof input.cwd === "string" ? input.cwd : process.cwd();

      if (input.tool === "read") {
        const filePath = getToolPath(output.args);
        if (filePath && (await isIgnored($, cwd, filePath))) {
          block("read", filePath);
        }
      }

      if (
        input.tool === "edit" ||
        input.tool === "write" ||
        input.tool === "patch"
      ) {
        const filePath = getToolPath(output.args);
        if (filePath && (await isIgnored($, cwd, filePath))) {
          block("edit", filePath);
        }
      }

      if (input.tool === "bash") {
        const command = String(output.args.command ?? "");
        for (const candidate of extractPathCandidates(command)) {
          if (await isIgnored($, cwd, candidate)) {
            block("bash", candidate);
          }
        }
      }
    },
    "experimental.chat.system.transform": async (_input, output) => {
      output.system = `${output.system}\n\nignored-path-guard is active. Treat gitignored files and paths as unavailable unless the user explicitly asks to inspect or modify them. Prefer tracked, unignored files when searching, reading, editing, or running shell commands.`;
    },
  };
};
