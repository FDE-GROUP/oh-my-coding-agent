import { describe, expect, it } from "vitest";
import { mechanismEventFromRecord, mechanismEventsFromEntries } from "../src/components/conversation/MechanismTimelinePanel.tsx";

describe("mechanismEventFromRecord", () => {
	it("maps compaction events with reason labels", () => {
		const start = mechanismEventFromRecord({ type: "compaction_start", reason: "threshold" });
		expect(start?.label).toBe("压缩开始");
		expect(start?.detail).toContain("达到阈值");
		expect(start?.source).toBe("live");

		const end = mechanismEventFromRecord({
			type: "compaction_end",
			reason: "overflow",
			result: undefined,
			aborted: false,
			willRetry: true,
		});
		expect(end?.label).toBe("压缩完成");
		expect(end?.detail).toContain("上下文溢出");
		expect(end?.detail).toContain("将重试");
	});

	it("maps auto retry events with attempt counts", () => {
		const start = mechanismEventFromRecord({
			type: "auto_retry_start",
			attempt: 2,
			maxAttempts: 5,
			delayMs: 1000,
			errorMessage: "provider 529",
		});
		expect(start?.label).toBe("自动重试 2/5");
		expect(start?.detail).toBe("provider 529");

		const end = mechanismEventFromRecord({ type: "auto_retry_end", success: false, attempt: 3, finalError: "boom" });
		expect(end?.label).toBe("重试失败（第 3 次）");
		expect(end?.detail).toBe("boom");
	});

	it("returns null for non-mechanism records", () => {
		expect(mechanismEventFromRecord({ type: "message_update" })).toBeNull();
		expect(mechanismEventFromRecord({ type: "queue_update", steering: [], followUp: [] })).toBeNull();
	});
});

describe("mechanismEventsFromEntries", () => {
	it("backfills only compaction entries with timestamps", () => {
		const events = mechanismEventsFromEntries([
			{ type: "session", version: 3 },
			{ type: "message", id: "m1", timestamp: "2026-11-07T06:00:00.000Z", message: {} },
			{ type: "compaction", id: "c1", timestamp: "2026-11-07T06:01:00.000Z", reason: "threshold" },
			{ type: "context_edit", id: "e1", timestamp: "2026-11-07T06:02:00.000Z" },
		]);
		expect(events).toHaveLength(1);
		expect(events[0]?.label).toBe("压缩（历史）");
		expect(events[0]?.detail).toContain("达到阈值");
		expect(events[0]?.at).toBe(Date.parse("2026-11-07T06:01:00.000Z"));
		expect(events[0]?.source).toBe("entry");
	});
});
