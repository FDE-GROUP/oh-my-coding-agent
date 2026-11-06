#!/usr/bin/env node
import { execFileSync } from "node:child_process";

const allowValue = process.env.PI_ALLOW_LOCKFILE_CHANGE;
const allowed = allowValue === "1" || allowValue === "true" || allowValue === "yes";

const stagedFiles = execFileSync("git", ["diff", "--cached", "--name-only"], { encoding: "utf8" })
	.split("\n")
	.map((line) => line.trim())
	.filter(Boolean);

if (!stagedFiles.includes("pnpm-lock.yaml")) {
	process.exit(0);
}

if (allowed) {
	console.error("pnpm-lock.yaml is staged; PI_ALLOW_LOCKFILE_CHANGE is set, allowing commit.");
	process.exit(0);
}

console.error("pnpm-lock.yaml is staged.");
console.error("");
console.error("Review lockfile changes before committing:");
console.error("  - confirm every new/updated package is intentional");
console.error("  - review dependency resolution and any new lifecycle scripts");
console.error("  - run pnpm install --frozen-lockfile in a clean checkout if needed");
console.error("");
console.error("If this lockfile change is intentional, commit with:");
console.error("  PI_ALLOW_LOCKFILE_CHANGE=1 git commit ...");
process.exit(1);
