import { createFileRoute } from "@tanstack/react-router";
import type { RuntimeEvent } from "../../server/runtime.ts";
import { getRuntimeManager } from "../../server/runtime-manager.ts";

/**
 * 会话事件流路由。
 *
 * @internal
 */
export const Route = createFileRoute("/api/sessions/$sessionId/events")({
	server: {
		handlers: {
			GET: async ({ params, request }) => {
				const runtime = getRuntimeManager().get(params.sessionId);
				if (!runtime) return Response.json({ error: "会话未加载" }, { status: 404 });

				const encoder = new TextEncoder();
				let sequence = 0;
				let cleanupStream: (() => void) | undefined;

				const stream = new ReadableStream<Uint8Array>({
					async start(controller) {
						let closed = false;
						let live = false;
						let unsubscribe: (() => void) | undefined;
						const buffered: RuntimeEvent[] = [];

						const send = (event: string, payload: unknown) => {
							if (closed) return;
							const envelope = { seq: ++sequence, ts: Date.now(), kind: event, payload };
							controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(envelope)}\n\n`));
						};

						const cleanup = () => {
							if (closed) return;
							closed = true;
							clearInterval(heartbeat);
							unsubscribe?.();
						};

						const heartbeat = setInterval(() => {
							if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
						}, 15_000);

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
							const snapshot = await runtime.snapshot();
							send("snapshot", snapshot);
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
