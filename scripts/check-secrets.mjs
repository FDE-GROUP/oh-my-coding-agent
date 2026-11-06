/**
 * High-confidence secret scan for tracked or staged files.
 *
 * This is a local guardrail, not a replacement for a full secret scanner.
 * It catches common provider tokens and private keys before they are committed.
 *
 * Usage: node scripts/check-secrets.mjs [--staged]
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const staged = process.argv.includes("--staged");
const IGNORED_PATH = /(^|\/)(?:\.git|node_modules|dist)\//;
// Test fixtures often use realistic-looking keys with an explicit fake marker.
const ALLOWLIST_LINE = /(?:example|sample|fake|dummy|placeholder|test[-_ ]?key)/i;
const BINARY_EXTENSIONS = new Set([
	".png",
	".jpg",
	".jpeg",
	".gif",
	".webp",
	".ico",
	".pdf",
	".zip",
	".gz",
	".zst",
	".wasm",
	".node",
]);

const patterns = [
	{ name: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
	{ name: "github-token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/ },
	{ name: "aws-access-key", pattern: /\bAKIA[0-9A-Z]{16}\b/ },
	{ name: "openai-deepseek-key", pattern: /\bsk-[A-Za-z0-9]{20,}\b/ },
	{ name: "google-api-key", pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
	{ name: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/ },
	{ name: "gitlab-token", pattern: /\bglpat-[A-Za-z0-9_-]{20,}\b/ },
	{ name: "stripe-key", pattern: /\b(?:sk|pk)_(?:live|test)_[A-Za-z0-9]{20,}\b/ },
	{
		name: "jwt",
		pattern: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/,
	},
];

const args = staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"] : ["ls-files", "-z"];
const files = execFileSync("git", args, { encoding: "utf8" })
	.split("\0")
	.filter(Boolean)
	.filter((file) => !IGNORED_PATH.test(file))
	.filter((file) => !BINARY_EXTENSIONS.has(file.slice(file.lastIndexOf("."))));

let failures = 0;
for (const file of files) {
	let text;
	try {
		text = readFileSync(file, "utf8");
	} catch {
		continue;
	}
	if (text.includes("\0")) continue;

	const lines = text.split("\n");
	for (const [index, line] of lines.entries()) {
		if (ALLOWLIST_LINE.test(line)) continue;
		for (const { name, pattern } of patterns) {
			if (!pattern.test(line)) continue;
			console.error(`${file}:${index + 1}: ${name}`);
			failures++;
		}
	}
}

if (failures > 0) {
	console.error(`\n${failures} potential secret(s) found.`);
	process.exit(1);
}
console.log(`Secret scan passed (${files.length} files).`);
