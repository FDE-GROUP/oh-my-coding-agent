import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
	createSession,
	fetchAdminSessions,
	fetchRuntimes,
	fetchSessions,
	fetchWorkspaces,
	type GithubRepoInfo,
	logout,
	renameSession,
	type WorkspaceInfo,
} from "../../lib/api.ts";
import { useViewport } from "../../lib/viewport.ts";
import type { Health } from "../../server/health.ts";
import type { SessionSummary } from "../../server/sessions.ts";
import { Conversation } from "../conversation/Conversation.tsx";
import { IconButton } from "../primitives/IconButton.tsx";
import { PanelLeftIcon } from "../primitives/icons.tsx";
import { AuditPanel } from "./AuditPanel.tsx";
import { IssuesPanel } from "./IssuesPanel.tsx";
import { NotificationBell } from "./NotificationBell.tsx";
import { RetentionPanel } from "./RetentionPanel.tsx";
import { RightPanel } from "./RightPanel.tsx";
import { Sidebar } from "./Sidebar.tsx";

export interface AppFrameProps {
	health: Health;
	sessionId?: string;
}

export function AppFrame({ health, sessionId }: AppFrameProps) {
	const { width } = useViewport();
	const isDrawer = width < 768;
	const [expanded, setExpanded] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [sessions, setSessions] = useState<Array<SessionSummary & { owner?: string }>>([]);
	const [sessionsLoaded, setSessionsLoaded] = useState(false);
	const [adminView, setAdminView] = useState(false);
	const [auditOpen, setAuditOpen] = useState(false);
	const [issuesOpen, setIssuesOpen] = useState(false);
	const [retentionOpen, setRetentionOpen] = useState(false);
	const [githubRepos, setGithubRepos] = useState<GithubRepoInfo[]>([]);
	const [runtimeStatus, setRuntimeStatus] = useState<Record<string, { busy: boolean }>>({});
	const [workspaces, setWorkspaces] = useState<WorkspaceInfo[]>([]);
	const [user, setUser] = useState<{ id: string; name: string; role: "admin" | "member" } | null>(null);
	const [workspaceId, setWorkspaceId] = useState("");
	const previousWide = useRef(width >= 1024);
	const navigate = useNavigate();

	const refreshSessions = useCallback(async () => {
		try {
			setSessions(adminView ? await fetchAdminSessions() : await fetchSessions());
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		} finally {
			setSessionsLoaded(true);
		}
	}, [adminView]);

	useEffect(() => {
		void refreshSessions();
	}, [refreshSessions]);

	useEffect(() => {
		if (window.localStorage.getItem("fdecode-admin-view") === "1") setAdminView(true);
	}, []);

	useEffect(() => {
		let cancelled = false;
		fetchWorkspaces()
			.then((data) => {
				if (cancelled) return;
				setUser(data.user);
				setWorkspaces(data.workspaces);
				setGithubRepos(data.githubRepos ?? []);
				const stored = window.localStorage.getItem("fdecode-workspace");
				const preferred = data.workspaces.find((workspace) => workspace.id === stored) ?? data.workspaces[0];
				if (preferred) setWorkspaceId((current) => current || preferred.id);
			})
			.catch((caught) => setError(caught instanceof Error ? caught.message : String(caught)));
		return () => {
			cancelled = true;
		};
	}, []);

	const handleWorkspaceChange = useCallback((id: string) => {
		setWorkspaceId(id);
		window.localStorage.setItem("fdecode-workspace", id);
	}, []);

	const handleAdminViewChange = useCallback((value: boolean) => {
		setAdminView(value);
		window.localStorage.setItem("fdecode-admin-view", value ? "1" : "0");
	}, []);

	const handleLogout = useCallback(async () => {
		await logout();
		window.location.href = "/login";
	}, []);

	const handleCreateFromIssue = useCallback(
		async (repoId: string, number: number) => {
			setError(null);
			try {
				const created = await createSession(workspaceId || undefined, { repoId, number });
				if (created.draft) window.sessionStorage.setItem(`fdecode-draft:${created.id}`, created.draft);
				await refreshSessions();
				setIssuesOpen(false);
				await navigate({ to: "/session/$sessionId", params: { sessionId: created.id } });
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : String(caught));
			}
		},
		[navigate, refreshSessions, workspaceId],
	);

	useEffect(() => {
		let cancelled = false;
		const load = async () => {
			try {
				const runtimes = await fetchRuntimes();
				if (cancelled) return;
				setRuntimeStatus(Object.fromEntries(runtimes.map((runtime) => [runtime.id, { busy: runtime.busy }])));
			} catch {
				// Status polling is best-effort.
			}
		};
		void load();
		const timer = setInterval(() => void load(), 2000);
		return () => {
			cancelled = true;
			clearInterval(timer);
		};
	}, []);

	useEffect(() => {
		if (!sessionsLoaded || sessionId || sessions.length === 0) return;
		void navigate({ to: "/session/$sessionId", params: { sessionId: sessions[0].id }, replace: true });
	}, [navigate, sessionId, sessions, sessionsLoaded]);

	useEffect(() => {
		const wide = width >= 1024;
		if (previousWide.current && !wide) setExpanded(false);
		previousWide.current = wide;
	}, [width]);

	const layoutLabel = isDrawer ? "抽屉" : expanded ? "280px" : "56px";
	const activeSession = sessions.find((session) => session.id === sessionId);
	const readOnly = Boolean(
		sessionId && user?.role === "admin" && adminView && activeSession?.owner && activeSession.owner !== user.id,
	);

	const handleNew = useCallback(async () => {
		setError(null);
		try {
			const created = await createSession(workspaceId || undefined);
			await refreshSessions();
			await navigate({ to: "/session/$sessionId", params: { sessionId: created.id } });
		} catch (caught) {
			setError(caught instanceof Error ? caught.message : String(caught));
		}
	}, [navigate, refreshSessions, workspaceId]);

	const handleRename = useCallback(
		async (id: string, name: string) => {
			setError(null);
			try {
				await renameSession(id, name);
				await refreshSessions();
			} catch (caught) {
				setError(caught instanceof Error ? caught.message : String(caught));
			}
		},
		[refreshSessions],
	);

	const handleSessionCreated = useCallback(
		(id: string) => {
			void refreshSessions();
			void navigate({ to: "/session/$sessionId", params: { sessionId: id } });
		},
		[navigate, refreshSessions],
	);

	return (
		<div className="flex h-dvh overflow-hidden bg-dsw-bg-base pb-[env(safe-area-inset-bottom)] text-dsw-label-primary">
			{!isDrawer && (
				<Sidebar
					collapsed={!expanded}
					loading={!sessionsLoaded}
					sessions={sessions}
					activeId={sessionId}
					onNew={handleNew}
					onRename={handleRename}
					runtimeStatus={runtimeStatus}
					workspaces={workspaces}
					workspaceId={workspaceId}
					onWorkspaceChange={handleWorkspaceChange}
					user={user}
					onLogout={handleLogout}
					isAdmin={user?.role === "admin"}
					adminView={adminView}
					onAdminViewChange={handleAdminViewChange}
					onShowAudit={() => setAuditOpen(true)}
					hasGithubRepos={githubRepos.length > 0}
					onOpenIssues={() => setIssuesOpen(true)}
					onShowRetention={() => setRetentionOpen(true)}
				/>
			)}

			{isDrawer && expanded && (
				<div className="fixed inset-0 z-40 flex">
					<Sidebar
						collapsed={false}
						drawer
						loading={!sessionsLoaded}
						sessions={sessions}
						activeId={sessionId}
						onNew={handleNew}
						onRename={handleRename}
						runtimeStatus={runtimeStatus}
						workspaces={workspaces}
						workspaceId={workspaceId}
						onWorkspaceChange={handleWorkspaceChange}
						user={user}
						onLogout={handleLogout}
						isAdmin={user?.role === "admin"}
						adminView={adminView}
						onAdminViewChange={handleAdminViewChange}
						onShowAudit={() => setAuditOpen(true)}
						hasGithubRepos={githubRepos.length > 0}
						onOpenIssues={() => setIssuesOpen(true)}
						onShowRetention={() => setRetentionOpen(true)}
						onClose={() => setExpanded(false)}
					/>
					<button
						type="button"
						aria-label="关闭侧栏"
						className="flex-1 overlay-mask"
						onClick={() => setExpanded(false)}
					/>
				</div>
			)}

			<main className="flex min-w-0 flex-1 flex-col">
				<header className="flex h-12 shrink-0 items-center gap-2 border-b border-hairline border-dsw-border-l1 px-3">
					<IconButton
						label={expanded ? "收起侧栏" : "展开侧栏"}
						aria-expanded={expanded}
						onClick={() => setExpanded((current) => !current)}
					>
						<PanelLeftIcon />
					</IconButton>
					<span className="truncate text-sm font-medium">FDE Code</span>
					<span className="ml-auto flex items-center">
						<NotificationBell />
					</span>
					<span className="shrink-0 font-mono text-[11px] text-dsw-label-tertiary">
						{width}px · {layoutLabel}
					</span>
				</header>

				{error && (
					<div className="border-b border-hairline border-dsw-border-l1 bg-dsw-bg-layer-1 px-4 py-2 text-xs text-dsw-state-error">
						{error}
					</div>
				)}

				<Conversation
					health={health}
					sessionId={sessionId}
					onSessionCreated={handleSessionCreated}
					onSessionSwitch={handleSessionCreated}
					readOnly={readOnly}
				/>
			</main>

			<RightPanel />
			{auditOpen && <AuditPanel onClose={() => setAuditOpen(false)} />}
			{retentionOpen && <RetentionPanel onClose={() => setRetentionOpen(false)} />}
			{issuesOpen && (
				<IssuesPanel
					repos={githubRepos}
					workspaceId={workspaceId}
					onClose={() => setIssuesOpen(false)}
					onCreate={(repoId, number) => void handleCreateFromIssue(repoId, number)}
				/>
			)}
		</div>
	);
}
