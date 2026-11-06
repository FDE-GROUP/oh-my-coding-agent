import { createFileRoute } from "@tanstack/react-router";
import { AppFrame } from "../components/layout/AppFrame.tsx";
import { getHealth } from "../server/health.ts";

/**
 * 首页。
 *
 * @internal
 */
export const Route = createFileRoute("/")({
	loader: () => getHealth(),
	component: Home,
});

function Home() {
	const health = Route.useLoaderData();
	return <AppFrame health={health} />;
}
