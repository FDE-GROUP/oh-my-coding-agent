import { createFileRoute } from "@tanstack/react-router";
import { AppFrame } from "../components/layout/AppFrame.tsx";
import { getHealth } from "../server/health.ts";

/**
 * 会话页面。
 *
 * @internal
 */
export const Route = createFileRoute("/session/$sessionId")({
	loader: () => getHealth(),
	component: SessionPage,
});

function SessionPage() {
	const health = Route.useLoaderData();
	const { sessionId } = Route.useParams();
	return <AppFrame health={health} sessionId={sessionId} />;
}
