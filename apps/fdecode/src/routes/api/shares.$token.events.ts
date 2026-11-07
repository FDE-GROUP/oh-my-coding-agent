import { createFileRoute } from "@tanstack/react-router";
import { ensureRuntime } from "../../server/access.ts";
import { findValidShare } from "../../server/shares.ts";
import { getCurrentUser } from "../../server/user.ts";

/**
 * 分享只读事件流。
 *
 * @internal
 */
export const Route = createFileRoute("/api/shares/$token/events")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				getCurrentUser();
				const share = findValidShare(params.token);
				if (!share) return Response.json({ error: "分享不存在或已失效" }, { status: 404 });
				const runtime = await ensureRuntime(share.sessionId, share.owner);
				if (!runtime) return Response.json({ error: "会话未加载" }, { status: 404 });

				const encoder = new TextEncoder();
				let sequence = 0;
				let cleanupStream: (() => void) | undefined;

				const stream = new ReadableStream<Uint8Array>({
					async start(controller) {
						let closed = false;
						let live = false;
						let unsubscribe: (() => void) | undefined;
						const buffered: unknown[] = [];
						const heartbeat = setInterval(() => {
							if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
						}, 15_000);

						// 已知限制：不对慢消费端做背压（不检查 controller.desiredSize）；
						// 本地优先、3~5 人规模下风险可忽略，重连即整份快照可自愈。见 README「架构」。
						const send = (event: string, payload: unknown) => {
							if (closed) return;
							controller.enqueue(
								encoder.encode(
									`event: ${event}\ndata: ${JSON.stringify({ seq: ++sequence, ts: Date.now(), kind: event, payload })}\n\n`,
								),
							);
						};
						const cleanup = () => {
							if (closed) return;
							closed = true;
							clearInterval(heartbeat);
							unsubscribe?.();
						};
						request.signal.addEventListener("abort", cleanup);
						cleanupStream = cleanup;

						unsubscribe = runtime.subscribe((event) => {
							if (event.kind === "exit") {
								if (live) send("event", event);
								cleanup();
								controller.close();
								return;
							}
							if (live) send("event", event);
							else buffered.push(event);
						});

						try {
							send("snapshot", await runtime.snapshot());
							live = true;
							for (const event of buffered) send("event", event);
							buffered.length = 0;
						} catch (error) {
							send("event", {
								kind: "status",
								status: "exited",
								error: error instanceof Error ? error.message : String(error),
							});
							cleanup();
							controller.close();
						}
					},
					cancel() {
						cleanupStream?.();
					},
				});

				return new Response(stream, {
					headers: {
						"content-type": "text/event-stream; charset=utf-8",
						"cache-control": "no-cache, no-transform",
						connection: "keep-alive",
						"x-accel-buffering": "no",
					},
				});
			},
		},
	},
});
