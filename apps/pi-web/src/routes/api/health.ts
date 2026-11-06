import { createFileRoute } from "@tanstack/react-router";
import { readHealth } from "../../server/health.ts";

export const Route = createFileRoute("/api/health")({
	server: {
		handlers: {
			GET: async () => Response.json(readHealth()),
		},
	},
});
