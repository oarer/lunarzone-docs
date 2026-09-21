#!/usr/bin/env node
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..", "dist");
const port = Number(process.env.PORT ?? 8080);

const TYPES = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".mjs": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".canvas": "application/json; charset=utf-8",
	".svg": "image/svg+xml",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".gif": "image/gif",
	".webp": "image/webp",
	".avif": "image/avif",
	".ico": "image/x-icon",
	".mp3": "audio/mpeg",
	".wav": "audio/wav",
	".ogg": "audio/ogg",
	".mp4": "video/mp4",
	".webm": "video/webm",
	".md": "text/markdown; charset=utf-8",
	".txt": "text/plain; charset=utf-8",
};

const server = http.createServer(async (req, res) => {
	try {
		const url = new URL(req.url, `http://${req.headers.host}`);
		let pathname = decodeURIComponent(url.pathname);
		if (pathname.endsWith("/")) pathname += "index.html";

		const filePath = path.join(root, path.normalize(pathname));
		if (!filePath.startsWith(root)) {
			res.writeHead(403).end("Forbidden");
			return;
		}

		const data = await fs.readFile(filePath);
		res.writeHead(200, {
			"Content-Type": TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream",
			"Cache-Control": "no-cache",
		});
		res.end(data);
	} catch {
		res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
		res.end("404 Not Found");
	}
});

server.listen(port, () => {
	console.log(`Сервер запущен: http://localhost:${port}`);
});
