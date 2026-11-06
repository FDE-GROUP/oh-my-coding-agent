import { describe, expect, it } from "vitest";
import { createJsonlSplitter } from "../src/server/jsonl.ts";

describe("createJsonlSplitter", () => {
	it("splits records across chunks and strips CRLF", () => {
		const splitter = createJsonlSplitter();
		expect(splitter.push('{"a":1}\r\n{"b"')).toEqual(['{"a":1}']);
		expect(splitter.push(':2}\n')).toEqual(['{"b":2}']);
		expect(splitter.flush()).toEqual([]);
	});

	it("does not split on U+2028 or U+2029", () => {
		const splitter = createJsonlSplitter();
		const record = JSON.stringify({ text: "before\u2028middle\u2029after" });
		expect(splitter.push(`${record}\n`)).toEqual([record]);
	});

	it("returns the trailing record on flush", () => {
		const splitter = createJsonlSplitter();
		expect(splitter.push('{"tail":true}')).toEqual([]);
		expect(splitter.flush()).toEqual(['{"tail":true}']);
		expect(splitter.flush()).toEqual([]);
	});
});
