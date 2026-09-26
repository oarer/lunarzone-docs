#!/usr/bin/env node
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const SKIP_DIRS = new Set([".git", "dist", "node_modules"]);
const OUT = path.join("static", "SHA256SUMS.txt");

async function walk(dir) {
	const entries = await fs.readdir(dir, { withFileTypes: true });
	const found = [];
	for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
		if (e.isDirectory()) {
			if (SKIP_DIRS.has(e.name)) continue;
			found.push(...(await walk(path.join(dir, e.name))));
		} else if (e.isFile()) {
			found.push(path.join(dir, e.name));
		}
	}
	return found;
}

const files = (await walk(root)).filter(
	(f) => path.relative(root, f).split(path.sep).join("/") !== OUT,
);
const lines = [
	"# sha256 sums, format: sha256sum. Проверяются: sha256sum -c static/SHA256SUMS.txt",
];
for (const f of files) {
	const hash = createHash("sha256")
		.update(await fs.readFile(f))
		.digest("hex");
	lines.push(`${hash}  ${path.relative(root, f).split(path.sep).join("/")}`);
}
await fs.mkdir(path.join(root, "static"), { recursive: true });
await fs.writeFile(path.join(root, OUT), `${lines.join("\n")}\n`);
console.log(`✔ ${OUT}: ${files.length} файлов`);
