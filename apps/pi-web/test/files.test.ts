import { mkdirSync, mkdtempSync, realpathSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { expandFiles, searchFiles } from "../src/server/files.ts";

const png = Buffer.from(
	"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
	"base64",
);

describe("files", () => {
	let root: string;
	let project: string;
	let outside: string;
	const previous = process.env.PI_WEB_CWD;

	beforeEach(() => {
		root = mkdtempSync(join(tmpdir(), "pi-web-files-"));
		project = join(root, "project");
		outside = join(root, "outside.txt");
		mkdirSync(join(project, "src"), { recursive: true });
		mkdirSync(join(project, "node_modules", "pkg"), { recursive: true });
		writeFileSync(join(project, "hello.txt"), "hello world\n");
		writeFileSync(join(project, "src", "nested.ts"), "export const value = 1\n");
		writeFileSync(join(project, "empty.txt"), "");
		writeFileSync(join(project, "binary.bin"), Buffer.from([0, 1, 2, 0, 3]));
		writeFileSync(join(project, "image.png"), png);
		writeFileSync(join(project, ".env"), "SECRET=1\n");
		writeFileSync(join(project, "id_rsa"), "key\n");
		writeFileSync(join(project, "node_modules", "pkg", "hidden.ts"), "hidden\n");
		writeFileSync(outside, "outside\n");
		process.env.PI_WEB_CWD = project;
	});

	afterEach(() => {
		if (previous === undefined) delete process.env.PI_WEB_CWD;
		else process.env.PI_WEB_CWD = previous;
	});

	it("wraps text files and attaches images", async () => {
		const result = await expandFiles(["hello.txt", "image.png"]);
		const absolute = realpathSync(join(project, "hello.txt"));
		expect(result.text).toContain(`<file name="${absolute}">`);
		expect(result.text).toContain("hello world");
		expect(result.images).toHaveLength(1);
		expect(result.images[0]?.mimeType).toBe("image/png");
		expect(result.notes).toEqual([]);
	});

	it("skips empty, binary, and out-of-project files", async () => {
		const result = await expandFiles(["empty.txt", "binary.bin", "../outside.txt"]);
		expect(result.text).toBe("");
		expect(result.images).toHaveLength(0);
		expect(result.notes).toHaveLength(3);
		expect(result.notes.join(" ")).toContain("空文件");
		expect(result.notes.join(" ")).toContain("二进制");
	});

	it("rejects sensitive files", async () => {
		const result = await expandFiles([".env", "id_rsa"]);
		expect(result.notes).toHaveLength(2);
		expect(result.notes.join(" ")).toContain("敏感文件");
	});

	it("searches the project and skips excluded directories", async () => {
		const files = await searchFiles("hello");
		expect(files.map((file) => file.path)).toContain("hello.txt");

		const hidden = await searchFiles("hidden");
		expect(hidden).toHaveLength(0);
	});
});
