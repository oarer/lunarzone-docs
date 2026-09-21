#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "dist");

const CANVAS_DIR = path.join(root, "canvas");
const ATTACHMENTS_DIR = path.join(root, "attachments");
const STATIC_FILES = [
	"index.html",
	"styles.css",
	"app.js",
	".nojekyll",
	"canvases.json",
];

async function walk(dir) {
	let found = [];
	let entries;
	try {
		entries = await fs.readdir(dir, { withFileTypes: true });
	} catch (err) {
		if (err.code === "ENOENT") return found;
		throw err;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) found = found.concat(await walk(full));
		else if (entry.isFile()) found.push(full);
	}
	return found;
}

function slugify(name) {
	return (
		name
			.normalize("NFKD")
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, "-")
			.replace(/^-+|-+$/g, "") || "canvas"
	);
}

async function collectCanvases() {
	const files = (await walk(CANVAS_DIR)).filter((f) =>
		f.toLowerCase().endsWith(".canvas"),
	);
	files.sort();

	const used = new Set();
	const canvases = [];
	for (const file of files) {
		const relative = path.relative(root, file).split(path.sep).join("/");
		const title = path.basename(file, path.extname(file));
		let slug = slugify(title);
		let i = 2;
		while (used.has(slug)) slug = `${slugify(title)}-${i++}`;
		used.add(slug);
		canvases.push({ slug, title, file: relative });
	}
	return canvases;
}

async function copyInto(src, destRelative) {
	const dest = path.join(outDir, destRelative);
	await fs.mkdir(path.dirname(dest), { recursive: true });
	await fs.cp(src, dest, { recursive: true });
}

async function main() {
	const canvases = await collectCanvases();
	if (canvases.length === 0) {
		console.warn("⚠  В папке canvas/ не найдено ни одного .canvas файла.");
	}

	// Manifest is committed at the repo root so that a branch deploy
	// (Settings -> Pages -> Deploy from a branch -> /) works as well.
	await fs.writeFile(
		path.join(root, "canvases.json"),
		`${JSON.stringify({ canvases }, null, "\t")}\n`,
	);

	await fs.rm(outDir, { recursive: true, force: true });
	await fs.mkdir(outDir, { recursive: true });

	for (const name of STATIC_FILES) {
		const src = path.join(root, name);
		try {
			await fs.access(src);
		} catch {
			continue;
		}
		await copyInto(src, name);
	}

	await copyInto(CANVAS_DIR, "canvas");

	try {
		await fs.access(ATTACHMENTS_DIR);
		await copyInto(ATTACHMENTS_DIR, "attachments");
	} catch {}

	console.log(`✔ Собрано в dist/ и обновлён canvases.json: ${canvases.length} canvas(ов)`);
	for (const c of canvases) console.log(`  • ${c.title}  →  /?canvas=${c.slug}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
