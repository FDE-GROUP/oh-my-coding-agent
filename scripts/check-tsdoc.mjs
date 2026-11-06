/**
 * 检查平台 TypeScript 代码的 TSDoc 注释。
 *
 * 范围：`apps/**\/src/**\/*.ts` 和 `extensions/**\/src/**\/*.ts`。
 * Pi 上游包不在范围内；它们不回改，避免增加 rebase 冲突。
 *
 * 用法：node scripts/check-tsdoc.mjs [--staged]
 */
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import {
	getLeadingCommentRanges,
	isArrowFunction,
	isClassDeclaration,
	isFunctionDeclaration,
	isFunctionExpression,
	isIdentifier,
	isInterfaceDeclaration,
	isTypeAliasDeclaration,
	isVariableStatement,
	SyntaxKind,
} from "typescript/unstable/ast";
import { API } from "typescript/unstable/sync";

const staged = process.argv.includes("--staged");
const files = execFileSync(
	"git",
	staged ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"] : ["ls-files", "-z"],
	{ encoding: "utf8" },
)
	.split("\0")
	.filter(Boolean)
	.filter((file) => /^(?:apps|extensions)\/.+\/src\/.*\.ts$/.test(file))
	.filter((file) => !file.endsWith(".d.ts"));

const failures = [];

function hasExport(node) {
	return node.modifiers?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword) ?? false;
}

function leadingDoc(sourceFile, node) {
	const ranges = getLeadingCommentRanges(sourceFile.text, node.getFullStart()) ?? [];
	const docs = ranges.filter((range) => sourceFile.text.startsWith("/**", range.pos));
	if (docs.length === 0) return undefined;
	const range = docs[docs.length - 1];
	return sourceFile.text.slice(range.pos, range.end);
}

function docLines(comment) {
	return comment
		.replace(/^\/\*\*/, "")
		.replace(/\*\/$/, "")
		.split("\n")
		.map((line) => line.replace(/^\s*\*\s?/, "").trim())
		.filter(Boolean);
}

function checkDoc(sourceFile, node, name, params = []) {
	const comment = leadingDoc(sourceFile, node);
	if (!comment) {
		failures.push(`${sourceFile.fileName}:${lineOf(sourceFile, node)}: ${name}: missing /** */ doc`);
		return;
	}
	const lines = docLines(comment);
	const summary = lines.find((line) => !line.startsWith("@"));
	if (!summary) {
		failures.push(`${sourceFile.fileName}:${lineOf(sourceFile, node)}: ${name}: missing summary`);
	} else {
		if (!/[\u4e00-\u9fff]/.test(summary)) {
			failures.push(`${sourceFile.fileName}:${lineOf(sourceFile, node)}: ${name}: summary must be Chinese`);
		}
		if (!summary.endsWith("。")) {
			failures.push(`${sourceFile.fileName}:${lineOf(sourceFile, node)}: ${name}: summary must end with 。`);
		}
	}
	if (!comment.includes("@public") && !comment.includes("@internal")) {
		failures.push(`${sourceFile.fileName}:${lineOf(sourceFile, node)}: ${name}: missing @public or @internal`);
	}
	for (const param of params) {
		if (!new RegExp(`@param\\s+${param}\\b`).test(comment)) {
			failures.push(`${sourceFile.fileName}:${lineOf(sourceFile, node)}: ${name}: missing @param ${param}`);
		}
	}
}

function lineOf(sourceFile, node) {
	return sourceFile.getLineAndCharacterOfPosition(node.getStart()).line + 1;
}

function paramNames(functionNode) {
	return functionNode.parameters
		.map((param) => (isIdentifier(param.name) ? param.name.text : undefined))
		.filter((name) => name !== undefined);
}

function returnNeedsDoc(functionNode) {
	const type = functionNode.type;
	if (!type) return false;
	const text = type.getText();
	return !/^(?:void|never|undefined)$/.test(text.trim());
}

function checkFunction(sourceFile, docNode, functionNode, name) {
	const params = paramNames(functionNode);
	checkDoc(sourceFile, docNode, name, params);
	if (returnNeedsDoc(functionNode) && !leadingDoc(sourceFile, docNode)?.includes("@returns")) {
		failures.push(`${sourceFile.fileName}:${lineOf(sourceFile, docNode)}: ${name}: missing @returns`);
	}
}

function visit(sourceFile, node) {
	if (isFunctionDeclaration(node) && hasExport(node)) {
		checkFunction(sourceFile, node, node, node.name?.text ?? "default");
	} else if (isClassDeclaration(node) && hasExport(node)) {
		checkDoc(sourceFile, node, node.name?.text ?? "default");
	} else if (isInterfaceDeclaration(node) && hasExport(node)) {
		checkDoc(sourceFile, node, node.name.text);
	} else if (isTypeAliasDeclaration(node) && hasExport(node)) {
		checkDoc(sourceFile, node, node.name.text);
	} else if (isVariableStatement(node) && hasExport(node)) {
		for (const declaration of node.declarationList.declarations) {
			if (!isIdentifier(declaration.name)) continue;
			const initializer = declaration.initializer;
			if (initializer && (isArrowFunction(initializer) || isFunctionExpression(initializer))) {
				checkFunction(sourceFile, node, initializer, declaration.name.text);
			} else {
				checkDoc(sourceFile, node, declaration.name.text);
			}
		}
	}
	node.forEachChild((child) => visit(sourceFile, child));
}

const configPath = resolve("tsconfig.check-tsdoc.json");
const config = JSON.stringify({
	compilerOptions: { noResolve: true, noLib: true, types: [] },
	files: files.map((file) => resolve(file)),
});
const api = new API({
	cwd: process.cwd(),
	fs: {
		fileExists: (fileName) => (resolve(fileName) === configPath ? true : undefined),
		readFile: (fileName) => (resolve(fileName) === configPath ? config : undefined),
	},
});

try {
	const program = api.updateSnapshot({ openProjects: [configPath] }).getProject(configPath).program;
	for (const file of files) {
		const sourceFile = program.getSourceFile(resolve(file));
		if (!sourceFile) {
			failures.push(`${file}: unable to parse source file`);
			continue;
		}
		visit(sourceFile, sourceFile);
	}
} finally {
	api.close();
}

if (failures.length > 0) {
	console.error("TSDoc violations:");
	for (const failure of failures) console.error(`  ${failure}`);
	process.exit(1);
}
console.log(`TSDoc check passed (${files.length} files).`);
