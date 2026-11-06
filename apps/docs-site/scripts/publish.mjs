#!/usr/bin/env node
// 发布 dist/ 到 pages 分支（GitHub Pages），替换旧 docsify 站。
// 在共享 worktree 之外建专用 worktree：整站替换、补 .nojekyll、普通 commit（不 force push）、push origin/pages。
// 安全默认：不带 --publish 时为 dry-run——只构建并在临时目录模拟拷贝、打印将执行的 git 动作，不动 pages、不 push。
// --publish 才真正发布（不可逆，替换线上站），须决策者授权后单独执行。
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const packageRoot = resolve(scriptDir, "..");
const repoRoot = resolve(packageRoot, "../..");
const distDir = join(packageRoot, "dist");
const blumeBin = join(packageRoot, "node_modules", ".bin", "blume");
const commitMessage = "docs(pages): publish unified docs site (blume)";

const argv = process.argv.slice(2);
const doPublish = argv.includes("--publish");
const skipBuild = argv.includes("--skip-build");
const worktreeFlag = argv.find((entry) => entry.startsWith("--worktree="));
const worktreePath = worktreeFlag ? worktreeFlag.slice("--worktree=".length) : "/tmp/omfde-pages";

// 执行命令并检查退出码；dry 为真时只打印不执行（用于 pages 分支的 git 动作）。
function run(command, args, options) {
	const dry = options?.dry === true;
	const cwd = options?.cwd ?? repoRoot;
	console.log(`[publish${dry ? ":dry" : ""}] (cd ${cwd}) ${command} ${args.join(" ")}`);
	if (dry) {
		return;
	}
	const result = spawnSync(command, args, { cwd, stdio: "inherit" });
	if (result.status !== 0) {
		throw new Error(`命令失败（exit ${result.status}）：${command} ${args.join(" ")}`);
	}
}

// 组装发布内容：dist/* 加 .nojekyll（blume 不产出；缺则 _astro/.well-known/_headers 被 Pages 的 Jekyll 忽略）。
function assemble(targetDir) {
	cpSync(distDir, targetDir, { recursive: true });
	writeFileSync(join(targetDir, ".nojekyll"), "");
}

// 1. 构建：sync 镜像+清洗，blume build 产出 dist/（--skip-build 复用现有 dist）。
if (!skipBuild) {
	run("node", [join(scriptDir, "sync.mjs")]);
	run(blumeBin, ["build"], { cwd: packageRoot });
}
if (!existsSync(join(distDir, "index.html"))) {
	throw new Error(`dist/ 缺 index.html，请先构建：${distDir}`);
}

// 2. dry-run：拷到临时目录验证文件操作（不碰 git、不碰 pages）。
if (!doPublish) {
	const stagingDir = "/tmp/omfde-pages-dryrun";
	rmSync(stagingDir, { recursive: true, force: true });
	mkdirSync(stagingDir, { recursive: true });
	assemble(stagingDir);
	const entries = readdirSync(stagingDir);
	console.log(`[publish:dry] 模拟内容于 ${stagingDir}`);
	console.log(`[publish:dry] 顶层条目 ${entries.length} 个，.nojekyll=${entries.includes(".nojekyll")}`);
}

// 3. git 发布动作：专用 worktree（不动共享工作区）。整站替换含删旧文件，故 worktree 内用 git add -A
//    （决策者已就此专用 worktree 授权该例外；共享 worktree 仍禁用）。
run("git", ["worktree", "add", worktreePath, "pages"], { dry: !doPublish });
if (doPublish) {
	for (const entry of readdirSync(worktreePath)) {
		if (entry !== ".git") {
			rmSync(join(worktreePath, entry), { recursive: true, force: true });
		}
	}
	assemble(worktreePath);
	run("git", ["add", "-A"], { cwd: worktreePath });
	const status = spawnSync("git", ["status", "--porcelain"], { cwd: worktreePath, encoding: "utf8" });
	if (status.stdout.trim() === "") {
		console.log("[publish] pages 无变化，跳过 commit/push。");
	} else {
		run("git", ["commit", "-m", commitMessage], { cwd: worktreePath });
		run("git", ["push", "origin", "pages"], { cwd: worktreePath });
	}
	run("git", ["worktree", "remove", worktreePath]);
	console.log("[publish] 完成：已 push origin/pages（GitHub Pages 稍后刷新）。");
} else {
	console.log(`[publish:dry] 清空 ${worktreePath}（保留 .git）→ 拷入 dist/* + .nojekyll`);
	run("git", ["add", "-A"], { cwd: worktreePath, dry: true });
	run("git", ["commit", "-m", commitMessage], { cwd: worktreePath, dry: true });
	run("git", ["push", "origin", "pages"], { cwd: worktreePath, dry: true });
	run("git", ["worktree", "remove", worktreePath], { dry: true });
	console.log("[publish:dry] 完成：未动 pages、未 push。加 --publish 才真正发布（须授权）。");
}
