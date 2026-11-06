import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, resolve, sep } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import serverEntry from "./dist/server/server.js";

const clientRoot = resolve(fileURLToPath(new URL("./dist/client/", import.meta.url)));
const port = Number(process.env.PI_WEB_PORT ?? process.env.PORT ?? 3210);

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

const server = createServer(async (request, response) => {
	const host = request.headers.host ?? `127.0.0.1:${port}`;
	const allowedHosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`]);
	if (!allowedHosts.has(host)) {
		response.writeHead(403, securityHeaders).end("forbidden host");
		return;
	}

	const origin = request.headers.origin;
	if (origin) {
		const allowedOrigins = new Set([`http://127.0.0.1:${port}`, `http://localhost:${port}`]);
		if (!allowedOrigins.has(origin)) {
			response.writeHead(403, securityHeaders).end("forbidden origin");
			return;
		}
	}
	if (request.headers["sec-fetch-site"] === "cross-site") {
		response.writeHead(403, securityHeaders).end("forbidden site");
		return;
	}

	let url;
	try {
		url = new URL(request.url ?? "/", `http://${host}`);
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

	if (request.method === "GET" || request.method === "HEAD") {
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

	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

	let fetchResponse;
	try {
		fetchResponse = await serverEntry.fetch(
			new Request(url, {
				method: request.method,
				headers: request.headers,
				body,
			}),
		);
	} catch (error) {
		console.error("[pi-web] request failed", error);
		response.writeHead(500).end("internal error");
		return;
	}

	const headers = Object.fromEntries(fetchResponse.headers);
	if (!headers["cache-control"]) headers["cache-control"] = "no-cache";
	response.writeHead(fetchResponse.status, { ...securityHeaders, ...headers });
	if (!fetchResponse.body || request.method === "HEAD") {
		response.end();
		return;
	}
	Readable.fromWeb(fetchResponse.body).pipe(response);
});

server.listen(port, "127.0.0.1", () => {
	console.log(`Pi Web UI listening on http://127.0.0.1:${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, () => {
		server.close(() => process.exit(0));
	});
}
