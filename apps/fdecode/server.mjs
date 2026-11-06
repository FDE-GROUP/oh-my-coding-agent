import { createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { extname, join, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { appendAudit } from "./audit.mjs";
import { hashToken, loadConfig } from "./config.mjs";
import serverEntry from "./dist/server/server.js";

const loaded = loadConfig();
if (loaded.errors.length > 0) {
	for (const error of loaded.errors) console.error(`[fdecode] ${error}`);
	process.exit(1);
}

const config = loaded.config;
const host = process.env.FDECODE_HOST?.trim() || config.host;
const port = Number(process.env.FDECODE_PORT ?? process.env.PORT ?? config.port);
const authEnabled = config.auth.users.length > 0;
const loopback = host === "127.0.0.1" || host === "localhost" || host === "::1";

if (!loopback && !authEnabled) {
	console.error("[fdecode] 拒绝启动：监听非回环地址时必须配置 auth.users。");
	process.exit(1);
}

const clientRoot = resolve(fileURLToPath(new URL("./dist/client/", import.meta.url)));
const COOKIE_NAME = "fdecode_session";
const SESSION_MAX_AGE = 7 * 24 * 60 * 60;

const securityHeaders = {
	"x-content-type-options": "nosniff",
	"x-frame-options": "DENY",
	"referrer-policy": "no-referrer",
	"content-security-policy":
		"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
};

const contentTypes = {
	".css": "text/css; charset=utf-8",
	".html": "text/html; charset=utf-8",
	".ico": "image/x-icon",
	".js": "text/javascript; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".map": "application/json; charset=utf-8",
	".png": "image/png",
	".svg": "image/svg+xml",
	".webmanifest": "application/manifest+json",
	".woff2": "font/woff2",
};

const allowedHostnames = new Set(["localhost", "127.0.0.1", "::1"]);
if (host !== "0.0.0.0" && host !== "::") allowedHostnames.add(host);
for (const addresses of Object.values(networkInterfaces())) {
	for (const address of addresses ?? []) allowedHostnames.add(address.address);
}
const configuredOrigins = new Set(config.publicOrigins);
for (const origin of config.publicOrigins) {
	try {
		allowedHostnames.add(new URL(origin).hostname);
	} catch {
		// Ignore malformed origins; validation happens per request.
	}
}

const loginAttempts = new Map();

function isInsideClient(path) {
	return path === clientRoot || path.startsWith(clientRoot + sep);
}

function staticFile(pathname) {
	const candidate = resolve(join(clientRoot, pathname));
	if (!isInsideClient(candidate)) return undefined;
	try {
		const stat = statSync(candidate);
		if (!stat.isFile()) return undefined;
		return { path: candidate, size: stat.size };
	} catch {
		return undefined;
	}
}

function signSession(userId) {
	const payload = Buffer.from(JSON.stringify({ userId, exp: Date.now() + SESSION_MAX_AGE * 1000 })).toString(
		"base64url",
	);
	const mac = createHmac("sha256", config.auth.secret).update(payload).digest("base64url");
	return `${payload}.${mac}`;
}

function verifySession(value) {
	if (!value) return undefined;
	const [payload, mac] = value.split(".");
	if (!payload || !mac) return undefined;
	const expected = createHmac("sha256", config.auth.secret).update(payload).digest("base64url");
	if (mac.length !== expected.length) return undefined;
	if (!timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return undefined;
	try {
		const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
		if (typeof data.exp !== "number" || data.exp < Date.now()) return undefined;
		return config.auth.users.find((user) => user.id === data.userId);
	} catch {
		return undefined;
	}
}

function parseCookies(header) {
	return Object.fromEntries(
		(header ?? "")
			.split(";")
			.map((part) => part.trim().split("="))
			.filter((pair) => pair.length === 2)
			.map(([key, value]) => [key, decodeURIComponent(value)]),
	);
}

function hostnameOf(hostHeader) {
	if (hostHeader.startsWith("[")) return hostHeader.slice(1, hostHeader.indexOf("]"));
	return hostHeader.split(":")[0];
}

function originAllowed(origin, hostHeader) {
	if (!origin) return true;
	if (configuredOrigins.has(origin)) return true;
	return origin === `http://${hostHeader}` || origin === `https://${hostHeader}`;
}

function isSecure(request) {
	return request.socket.encrypted === true || request.headers["x-forwarded-proto"] === "https";
}

function cookieHeader(userId, secure) {
	return `${COOKIE_NAME}=${signSession(userId)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_MAX_AGE}${secure ? "; Secure" : ""}`;
}

function loginPage(message = "") {
	return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>FDE Code · 登录</title>
<style>body{font-family:system-ui,sans-serif;background:#f6f7f9;color:#16181d;display:grid;place-items:center;min-height:100dvh;margin:0}
main{width:min(360px,90vw);background:#fff;border:1px solid #00000014;border-radius:12px;padding:28px;box-shadow:0 8px 24px #0000000d}
h1{font-size:18px;margin:0 0 6px}p{font-size:13px;color:#5b6472;margin:0 0 18px}
input{width:100%;box-sizing:border-box;height:40px;border:1px solid #0000001f;border-radius:8px;padding:0 10px;font-size:14px}
button{margin-top:12px;width:100%;height:40px;border:0;border-radius:8px;background:#16181d;color:#fff;font-size:14px;cursor:pointer}
.error{color:#b42318;font-size:12px;margin-top:10px;min-height:16px}</style></head>
<body><main><h1>FDE Code</h1><p>输入访问令牌继续。</p>
<form id="form"><input id="token" type="password" autocomplete="current-password" placeholder="访问令牌" required autofocus><button type="submit">登录</button></form>
<div class="error" id="error">${message}</div></main>
<script>document.getElementById("form").addEventListener("submit",async(e)=>{e.preventDefault();const error=document.getElementById("error");error.textContent="";
try{const response=await fetch("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({token:document.getElementById("token").value})});
const body=await response.json().catch(()=>({}));if(!response.ok){error.textContent=body.error||"登录失败";return}const next=new URLSearchParams(location.search).get("next");location.href=next&&next.startsWith("/")&&!next.startsWith("//")?next:"/"}catch{error.textContent="无法连接服务"}})</script>
</body></html>`;
}

function respondJson(response, status, body) {
	response.writeHead(status, { ...securityHeaders, "content-type": "application/json; charset=utf-8" });
	response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
	const hostHeader = request.headers.host ?? `${host}:${port}`;
	const hostname = hostnameOf(hostHeader);
	if (!allowedHostnames.has(hostname)) {
		response.writeHead(403, securityHeaders).end("forbidden host");
		return;
	}

	const origin = request.headers.origin;
	if (!originAllowed(origin, hostHeader)) {
		response.writeHead(403, securityHeaders).end("forbidden origin");
		return;
	}
	if (request.headers["sec-fetch-site"] === "cross-site") {
		response.writeHead(403, securityHeaders).end("forbidden site");
		return;
	}

	let url;
	try {
		url = new URL(request.url ?? "/", `http://${hostHeader}`);
	} catch {
		response.writeHead(400).end("bad request");
		return;
	}

	let pathname;
	try {
		pathname = decodeURIComponent(url.pathname);
	} catch {
		response.writeHead(400).end("bad request");
		return;
	}

	const publicAsset =
		pathname.startsWith("/assets/") ||
		pathname === "/favicon.ico" ||
		pathname === "/favicon.svg" ||
		pathname === "/manifest.webmanifest" ||
		pathname.startsWith("/icons/");

	if ((request.method === "GET" || request.method === "HEAD") && (publicAsset || pathname === "/login")) {
		if (pathname === "/login" && authEnabled && !verifySession(parseCookies(request.headers.cookie)[COOKIE_NAME])) {
			response.writeHead(200, { ...securityHeaders, "content-type": "text/html; charset=utf-8" });
			response.end(loginPage());
			return;
		}
		if (pathname === "/login") {
			response.writeHead(302, { location: "/" }).end();
			return;
		}
		const file = staticFile(pathname);
		if (file) {
			const cache = pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache";
			response.writeHead(200, {
				...securityHeaders,
				"content-type": contentTypes[extname(file.path)] ?? "application/octet-stream",
				"content-length": file.size,
				"cache-control": cache,
			});
			if (request.method === "HEAD") response.end();
			else createReadStream(file.path).pipe(response);
			return;
		}
	}

	if (pathname === "/api/auth/login" && request.method === "POST") {
		const ip = request.socket.remoteAddress ?? "unknown";
		const now = Date.now();
		const attempt = loginAttempts.get(ip);
		if (attempt && attempt.reset > now && attempt.count >= 10) {
			respondJson(response, 429, { error: "尝试过多，请稍后再试" });
			return;
		}
		if (!attempt || attempt.reset <= now) loginAttempts.set(ip, { count: 0, reset: now + 60_000 });

		const chunks = [];
		for await (const chunk of request) chunks.push(chunk);
		let token = "";
		try {
			token = JSON.parse(Buffer.concat(chunks).toString("utf8")).token ?? "";
		} catch {
			token = "";
		}

		if (!authEnabled) {
			response.writeHead(302, { location: "/" }).end();
			return;
		}

		const hash = Buffer.from(hashToken(String(token)));
		const user = config.auth.users.find((candidate) => {
			const expected = Buffer.from(candidate.tokenHash);
			return expected.length === hash.length && timingSafeEqual(expected, hash);
		});
		const current = loginAttempts.get(ip) ?? { count: 0, reset: now + 60_000 };
		current.count += 1;
		loginAttempts.set(ip, current);

		if (!user) {
			appendAudit({
				user: "anonymous",
				role: "member",
				action: "auth.login_failed",
				target: "/login",
				result: "failed",
			});
			respondJson(response, 401, { error: "令牌无效" });
			return;
		}
		loginAttempts.delete(ip);
		appendAudit({ user: user.id, role: user.role, action: "auth.login", target: "/login", result: "ok" });
		response.writeHead(200, {
			...securityHeaders,
			"content-type": "application/json; charset=utf-8",
			"set-cookie": cookieHeader(user.id, isSecure(request)),
		});
		response.end(JSON.stringify({ ok: true, user: { id: user.id, name: user.name } }));
		return;
	}

	const user = authEnabled
		? verifySession(parseCookies(request.headers.cookie)[COOKIE_NAME])
		: { id: "local", name: "Local" };

	if (authEnabled && !user) {
		if (pathname === "/api/auth/me") {
			respondJson(response, 401, { error: "未登录" });
			return;
		}
		if (pathname.startsWith("/api/") || pathname === "/events") {
			respondJson(response, 401, { error: "未登录" });
			return;
		}
		const next = `${pathname}${url.search}`;
		response.writeHead(302, { location: `/login?next=${encodeURIComponent(next)}` }).end();
		return;
	}

	if (pathname === "/api/auth/logout" && request.method === "POST") {
		response.writeHead(200, {
			...securityHeaders,
			"content-type": "application/json; charset=utf-8",
			"set-cookie": `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0`,
		});
		response.end(JSON.stringify({ ok: true }));
		return;
	}

	if (pathname === "/api/auth/me") {
		respondJson(response, 200, { user });
		return;
	}

	const headers = new Headers();
	for (const [key, value] of Object.entries(request.headers)) {
		if (key === "x-fdecode-user" || key === "x-fdecode-user-name" || key === "x-fdecode-user-role") continue;
		if (Array.isArray(value)) headers.set(key, value.join(", "));
		else if (value !== undefined) headers.set(key, value);
	}
	headers.set("x-fdecode-user", user.id);
	headers.set("x-fdecode-user-name", user.name);
	headers.set("x-fdecode-user-role", user.role ?? "member");

	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

	let fetchResponse;
	try {
		fetchResponse = await serverEntry.fetch(
			new Request(url, {
				method: request.method,
				headers,
				body,
			}),
		);
	} catch (error) {
		console.error("[fdecode] request failed", error);
		response.writeHead(500).end("internal error");
		return;
	}

	const responseHeaders = Object.fromEntries(fetchResponse.headers);
	if (!responseHeaders["cache-control"]) responseHeaders["cache-control"] = "no-cache";
	response.writeHead(fetchResponse.status, { ...securityHeaders, ...responseHeaders });
	if (!fetchResponse.body || request.method === "HEAD") {
		response.end();
		return;
	}
	Readable.fromWeb(fetchResponse.body).pipe(response);
});

server.listen(port, host, () => {
	const address = host === "0.0.0.0" ? "all interfaces" : host;
	console.log(`FDE Code UI listening on http://${address}:${port} (auth ${authEnabled ? "on" : "off"})`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, () => {
		server.close(() => process.exit(0));
	});
}
