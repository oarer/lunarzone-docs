import {
	JSONCanvasViewer,
	parser,
	fetchCanvas,
	Controls,
	Minimap,
} from "https://unpkg.com/json-canvas-viewer";

const VIEWER_MODULES = [Controls, Minimap];

const els = {
	viewer: document.getElementById("viewer"),
	picker: document.getElementById("canvas-picker"),
	themeToggle: document.getElementById("theme-toggle"),
	openRaw: document.getElementById("open-raw"),
	status: document.getElementById("status"),
	statusText: document.getElementById("status-text"),
	statusSpinner: document.getElementById("status-spinner"),
};

const THEME_KEY = "canvas-viewer-theme";

function preferredTheme() {
	const stored = localStorage.getItem(THEME_KEY);
	if (stored === "light" || stored === "dark") return stored;
	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

function applyTheme(theme) {
	document.documentElement.dataset.theme = theme;
	localStorage.setItem(THEME_KEY, theme);
	if (viewer) viewer.changeTheme(theme);
}

function showStatus(text, spinning = true) {
	els.status.hidden = false;
	els.statusText.textContent = text;
	els.statusSpinner.hidden = !spinning;
}

function hideStatus() {
	els.status.hidden = true;
}

async function loadManifest() {
	const res = await fetch("canvases.json", { cache: "no-cache" });
	if (!res.ok) throw new Error(`canvases.json: HTTP ${res.status}`);
	const data = await res.json();
	const canvases = Array.isArray(data) ? data : data.canvases;
	if (!Array.isArray(canvases) || canvases.length === 0) {
		throw new Error("Не найдено ни одного .canvas файла");
	}
	return canvases;
}

function buildAttachments(canvas) {
	const map = {};
	for (const node of canvas.nodes ?? []) {
		if (node.type !== "file" || !node.file) continue;
		if (/^[a-z][a-z0-9+.-]*:\/\//i.test(node.file)) continue;
		const base = node.file.split(/[\\/]/).pop();
		if (!base) continue;
		map[node.file] = `attachments/${encodeURIComponent(base)}`;
	}
	return map;
}

let viewer = null;
let canvases = [];

function currentSlug() {
	const params = new URLSearchParams(location.search);
	return params.get("canvas");
}

function selectCanvas(slug, { push = true } = {}) {
	const entry =
		canvases.find((c) => c.slug === slug) ??
		canvases.find((c) => c.file === slug) ??
		canvases[0];
	if (!entry) return;

	if (els.picker.value !== entry.slug) els.picker.value = entry.slug;
	if (els.openRaw) els.openRaw.href = encodeURI(entry.file);

	if (push) {
		const url = new URL(location.href);
		url.searchParams.set("canvas", entry.slug);
		history.replaceState(null, "", url);
	}

	return loadCanvas(entry);
}

async function loadCanvas(entry) {
	document.title = entry.title || "Canvas";
	showStatus(`Загрузка «${entry.title}»…`);
	try {
		const canvas = await fetchCanvas(encodeURI(entry.file));
		const attachments = buildAttachments(canvas);
		if (!viewer) {
			viewer = new JSONCanvasViewer(
				{
					container: els.viewer,
					theme: preferredTheme(),
					loading: "none",
					parser,
				},
				VIEWER_MODULES,
			);
			window.canvasViewer = viewer;
		}
		viewer.load({ canvas, attachments });
		hideStatus();
	} catch (err) {
		console.error(err);
		showStatus(`Не удалось загрузить canvas: ${err.message}`, false);
	}
}

async function init() {
	applyTheme(preferredTheme());
	els.themeToggle.addEventListener("click", () => {
		applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
	});

	try {
		canvases = await loadManifest();
	} catch (err) {
		showStatus(err.message, false);
		return;
	}

	for (const entry of canvases) {
		const option = document.createElement("option");
		option.value = entry.slug;
		option.textContent = entry.title;
		els.picker.appendChild(option);
	}
	els.picker.hidden = canvases.length <= 1;
	els.picker.addEventListener("change", () => selectCanvas(els.picker.value));

	selectCanvas(currentSlug(), { push: false });

	window.addEventListener("popstate", () => {
		selectCanvas(currentSlug(), { push: false });
	});
}

init();
