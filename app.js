import {
	Controls,
	fetchCanvas,
	JSONCanvasViewer,
	Minimap,
	parser,
} from "https://unpkg.com/json-canvas-viewer";

const VIEWER_MODULES = [Controls, Minimap];

/* ---------------- lucide icons (v0.544.0, ISC, inlined) ---------------- */

const ICONS = {"house":[["path",{"d":"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"}],["path",{"d":"M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"}]],"file-text":[["path",{"d":"M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"}],["path",{"d":"M14 2v4a2 2 0 0 0 2 2h4"}],["path",{"d":"M10 9H8"}],["path",{"d":"M16 13H8"}],["path",{"d":"M16 17H8"}]],"network":[["rect",{"x":"16","y":"16","width":"6","height":"6","rx":"1"}],["rect",{"x":"2","y":"16","width":"6","height":"6","rx":"1"}],["rect",{"x":"9","y":"2","width":"6","height":"6","rx":"1"}],["path",{"d":"M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"}],["path",{"d":"M12 12V8"}]],"sun":[["circle",{"cx":"12","cy":"12","r":"4"}],["path",{"d":"M12 2v2"}],["path",{"d":"M12 20v2"}],["path",{"d":"m4.93 4.93 1.41 1.41"}],["path",{"d":"m17.66 17.66 1.41 1.41"}],["path",{"d":"M2 12h2"}],["path",{"d":"M20 12h2"}],["path",{"d":"m6.34 17.66-1.41 1.41"}],["path",{"d":"m19.07 4.93-1.41 1.41"}]],"moon":[["path",{"d":"M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"}]],"menu":[["path",{"d":"M4 5h16"}],["path",{"d":"M4 12h16"}],["path",{"d":"M4 19h16"}]],"x":[["path",{"d":"M18 6 6 18"}],["path",{"d":"m6 6 12 12"}]],"chevron-left":[["path",{"d":"m15 18-6-6 6-6"}]],"chevron-right":[["path",{"d":"m9 18 6-6-6-6"}]],"list":[["path",{"d":"M3 5h.01"}],["path",{"d":"M3 12h.01"}],["path",{"d":"M3 19h.01"}],["path",{"d":"M8 5h13"}],["path",{"d":"M8 12h13"}],["path",{"d":"M8 19h13"}]],"zoom-in":[["circle",{"cx":"11","cy":"11","r":"8"}],["line",{"x1":"21","x2":"16.65","y1":"21","y2":"16.65"}],["line",{"x1":"11","x2":"11","y1":"8","y2":"14"}],["line",{"x1":"8","x2":"14","y1":"11","y2":"11"}]],"zoom-out":[["circle",{"cx":"11","cy":"11","r":"8"}],["line",{"x1":"21","x2":"16.65","y1":"21","y2":"16.65"}],["line",{"x1":"8","x2":"14","y1":"11","y2":"11"}]]};

function icon(name, size = 18) {
	const nodes = ICONS[name] ?? [];
	const inner = nodes
		.map(
			([tag, attrs]) =>
				`<${tag} ${Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(" ")}/>`,
		)
		.join("");
	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

function refreshIcons(root = document) {
	for (const el of root.querySelectorAll("[data-lucide]")) {
		const name = el.getAttribute("data-lucide");
		if (!ICONS[name]) continue;
		const size = Number(el.getAttribute("data-size") || 18);
		const tpl = document.createElement("template");
		tpl.innerHTML = icon(name, size).trim();
		el.replaceWith(tpl.content.firstChild);
	}
}

const els = {
	main: document.getElementById("main"),
	viewer: document.getElementById("viewer"),
	doc: document.getElementById("view-doc"),
	docWrap: document.getElementById("view-doc-wrap"),
	toc: document.getElementById("toc"),
	tocNav: document.getElementById("toc-nav"),
	tocToggle: document.getElementById("toc-toggle"),
	home: document.getElementById("view-home"),
	homeCards: document.getElementById("home-cards"),
	homeLogs: document.getElementById("home-logs"),
	homeExports: document.getElementById("home-exports"),
	docPicker: document.getElementById("doc-picker"),
	picker: document.getElementById("canvas-picker"),
	navDoc: document.getElementById("nav-doc"),
	navCanvas: document.getElementById("nav-canvas"),
	nav: document.getElementById("main-nav"),
	navToggle: document.getElementById("nav-toggle"),
	themeToggle: document.getElementById("theme-toggle"),
	openRaw: document.getElementById("open-raw"),
	status: document.getElementById("status"),
	statusText: document.getElementById("status-text"),
	statusSpinner: document.getElementById("status-spinner"),
	lb: document.getElementById("lightbox"),
	lbImg: document.getElementById("lb-img"),
	lbCap: document.getElementById("lb-cap"),
	lbClose: document.getElementById("lb-close"),
	lbPrev: document.getElementById("lb-prev"),
	lbNext: document.getElementById("lb-next"),
	lbZoomIn: document.getElementById("lb-zoom-in"),
	lbZoomOut: document.getElementById("lb-zoom-out"),
};

const THEME_KEY = "canvas-viewer-theme";

/* ---------------- theme ---------------- */

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
	els.themeToggle.innerHTML = icon(theme === "dark" ? "sun" : "moon", 18);
	els.themeToggle.setAttribute(
		"aria-label",
		theme === "dark" ? "Светлая тема" : "Тёмная тема",
	);
	if (viewer) viewer.changeTheme(theme);
}

/* ---------------- status ---------------- */

function showStatus(text, spinning = true) {
	els.status.hidden = false;
	els.statusText.textContent = text;
	els.statusSpinner.hidden = !spinning;
}

function hideStatus() {
	els.status.hidden = true;
}

/* ---------------- mini markdown ----------------
   Zero-dependency renderer: headings, hr, fenced code, tables,
   lists, blockquotes, paragraphs + inline code/bold/italic/
   links/images + Obsidian ![[embed|width]] (resolved to
   static/images/). Raw HTML from source is escaped. */

function escapeHtml(s) {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function headingSlug(text) {
	return text
		.toLowerCase()
		.replace(/[^\p{L}\p{N}\s-]/gu, "")
		.trim()
		.replace(/\s+/g, "-");
}

function encodePath(p) {
	return p.split("/").map(encodeURIComponent).join("/");
}

function extractEmbeds(src) {
	const imgs = [];
	const text = src.replace(
		/!\[\[([^\]|[\]]+?)(?:\|(\d+))?(?:\|[^\][\]]*)?\]\]/g,
		(_, name, width) => {
			const file = name.trim();
			const base = file.split(/[\\/]/).pop();
			imgs.push({ src: `static/images/${encodePath(base)}`, alt: base, width });
			return `\u0000IMG${imgs.length - 1}\u0000`;
		},
	);
	return { text, imgs };
}

function renderInline(raw, imgs) {
	let s = escapeHtml(raw);
	s = s.replace(/\u0000IMG(\d+)\u0000/g, (_, n) => {
		const img = imgs[Number(n)];
		if (!img) return "";
		const w = img.width ? ` width="${img.width}"` : "";
		return `<img src="${img.src}" alt="${escapeHtml(img.alt)}" loading="lazy"${w}>`;
	});
	const codeSpans = [];
	s = s.replace(/`([^`]+?)`/g, (_, c) => {
		codeSpans.push(c);
		return `\u0000CODE${codeSpans.length - 1}\u0000`;
	});
	s = s.replace(
		/!\[([^\]]*?)\]\((\S+?)(?:\s+"[^"]*?")?\)/g,
		(_, alt, url) =>
			`<img src="${encodeURI(url)}" alt="${alt}" loading="lazy">`,
	);
	s = s.replace(/\[([^\]]*?)\]\((\S+?)(?:\s+"[^"]*?")?\)/g, (_, label, url) => {
		const external = /^(?:https?:|mailto:)/i.test(url);
		const extra = external ? ` target="_blank" rel="noopener"` : "";
		return `<a href="${encodeURI(url)}"${extra}>${label}</a>`;
	});
	s = s.replace(/\*\*\*([^*]+?)\*\*\*/g, "<strong><em>$1</em></strong>");
	s = s.replace(/\*\*([^*]+?)\*\*/g, "<strong>$1</strong>");
	s = s.replace(/(^|[^*\w])\*([^*\n]+?)\*/g, "$1<em>$2</em>");
	s = s.replace(
		/\u0000CODE(\d+)\u0000/g,
		(_, n) => `<code>${codeSpans[Number(n)]}</code>`,
	);
	return s;
}

function splitRow(line) {
	const cells = [];
	let cur = "";
	let inCode = false;
	let depth = 0;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (ch === "`") inCode = !inCode;
		if (!inCode) {
			if (line.startsWith("[[", i)) depth++;
			if (line.startsWith("]]", i)) depth = Math.max(0, depth - 1);
			if (ch === "|" && depth === 0) {
				cells.push(cur);
				cur = "";
				continue;
			}
		}
		cur += ch;
	}
	cells.push(cur);
	return cells;
}

function isDelimRow(line) {
	const cells = splitRow(line)
		.map((c) => c.trim())
		.filter((c) => c !== "");
	return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

function renderTable(headerLine, delimLine, bodyLines, imgs) {
	const trimEdges = (cells) => {
		const out = cells.slice();
		if (out.length > 0 && out[0].trim() === "") out.shift();
		if (out.length > 0 && out[out.length - 1].trim() === "") out.pop();
		return out;
	};
	const align = trimEdges(splitRow(delimLine)).map((c) => {
		const t = c.trim();
		const l = t.startsWith(":");
		const r = t.endsWith(":");
		if (l && r) return "center";
		if (r) return "right";
		return "left";
	});
	const renderCell = (cell, tag, i) => {
		const a = align[i] && align[i] !== "left" ? ` align="${align[i]}"` : "";
		return `<${tag}${a}>${renderInline(cell.trim(), imgs)}</${tag}>`;
	};
	let html = '<div class="table-wrap"><table>\n<thead>\n<tr>';
	trimEdges(splitRow(headerLine)).forEach((c, i) => {
		html += renderCell(c, "th", i);
	});
	html += "</tr>\n</thead>\n<tbody>\n";
	for (const line of bodyLines) {
		html += "<tr>";
		trimEdges(splitRow(line)).forEach((c, i) => {
			html += renderCell(c, "td", i);
		});
		html += "</tr>\n";
	}
	html += "</tbody>\n</table></div>";
	return html;
}

function renderMarkdown(src) {
	const { text, imgs } = extractEmbeds(src);
	const lines = text.split("\n");
	const out = [];
	const toc = [];
	const usedIds = new Map();
	let i = 0;

	const flushList = (items) => {
		if (items.length === 0) return "";
		const first = items[0];
		const tag = first.ordered ? "ol" : "ul";
		let html = `<${tag}>\n`;
		for (const it of items) {
			html += `<li>${renderInline(it.text, imgs)}`;
			if (it.children.length > 0) html += flushList(it.children);
			html += "</li>\n";
		}
		html += `</${tag}>\n`;
		return html;
	};

	while (i < lines.length) {
		const line = lines[i];

		if (/^\s*$/.test(line)) {
			i++;
			continue;
		}

		if (/^\s*```/.test(line)) {
			const buf = [];
			i++;
			while (i < lines.length && !/^\s*```/.test(lines[i])) {
				buf.push(lines[i]);
				i++;
			}
			i++;
			out.push(`<pre><code>${escapeHtml(buf.join("\n"))}</code></pre>`);
			continue;
		}

		const h = line.match(/^(#{1,6})\s+(.*)$/);
		if (h) {
			const level = h[1].length;
			const title = renderInline(h[2].trim(), imgs);
			const plain = h[2].replace(/`([^`]+)`/g, "$1").trim();
			let id = headingSlug(plain);
			const n = usedIds.get(id) ?? 0;
			usedIds.set(id, n + 1);
			if (n > 0) id = `${id}-${n + 1}`;
			if (level <= 3) toc.push({ level, id, title: plain });
			out.push(`<h${level} id="${id}">${title}</h${level}>`);
			i++;
			continue;
		}

		if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) {
			out.push("<hr>");
			i++;
			continue;
		}

		if (
			line.includes("|") &&
			i + 1 < lines.length &&
			isDelimRow(lines[i + 1])
		) {
			const body = [];
			const delimLine = lines[i + 1];
			i += 2;
			while (
				i < lines.length &&
				lines[i].includes("|") &&
				/^\s*\|?.*\|/.test(lines[i])
			) {
				body.push(lines[i]);
				i++;
			}
			out.push(renderTable(line, delimLine, body, imgs));
			continue;
		}

		const listMatch = line.match(/^(\s*)(?:(-|\+|\*)|(\d+)[.)])\s+(.*)$/);
		if (listMatch) {
			const items = [];
			while (i < lines.length) {
				const m = lines[i].match(/^(\s*)(?:(-|\+|\*)|(\d+)[.)])\s+(.*)$/);
				if (!m) break;
				const indent = m[1].replace(/\t/g, "    ").length;
				if (indent > 0 && items.length > 0) {
					const parent = items[items.length - 1];
					parent.children.push({
						text: m[4],
						ordered: Boolean(m[3]),
						children: [],
					});
				} else {
					items.push({ text: m[4], ordered: Boolean(m[3]), children: [] });
				}
				i++;
			}
			out.push(flushList(items));
			continue;
		}

		if (/^\s*>/.test(line)) {
			const buf = [];
			while (i < lines.length && /^\s*>/.test(lines[i])) {
				buf.push(lines[i].replace(/^\s*>\s?/, ""));
				i++;
			}
			const inner = buf.map((l) => renderInline(l, imgs)).join("<br>\n");
			out.push(`<blockquote>\n${inner}\n</blockquote>`);
			continue;
		}

		const buf = [line];
		i++;
		while (
			i < lines.length &&
			!/^\s*$/.test(lines[i]) &&
			!/^(#{1,6}\s|```|\s*>)/.test(lines[i]) &&
			!/^\s*(---|\*\*\*|___)\s*$/.test(lines[i]) &&
			!/^(\s*(?:(-|\+|\*)|(\d+)[.)])\s+)/.test(lines[i]) &&
			!(
				lines[i].includes("|") &&
				i + 1 < lines.length &&
				isDelimRow(lines[i + 1])
			)
		) {
			buf.push(lines[i]);
			i++;
		}
		out.push(`<p>${buf.map((l) => renderInline(l, imgs)).join("<br>\n")}</p>`);
	}

	return { html: out.join("\n"), toc };
}

/* ---------------- manifests & state ---------------- */

let viewer = null;
let canvases = [];
let docs = [];
const siteFiles = { logs: [], exports: [] };

async function loadManifest() {
	const res = await fetch("canvases.json", { cache: "no-cache" });
	if (!res.ok) throw new Error(`canvases.json: HTTP ${res.status}`);
	const data = await res.json();
	const list = Array.isArray(data) ? data : data.canvases;
	if (!Array.isArray(list) || list.length === 0) {
		throw new Error("Не найдено ни одного .canvas файла");
	}
	return list;
}

async function loadDocs() {
	try {
		const res = await fetch("docs.json", { cache: "no-cache" });
		if (!res.ok) return [];
		const data = await res.json();
		const list = Array.isArray(data) ? data : data.docs;
		return Array.isArray(list) ? list : [];
	} catch {
		return [];
	}
}

async function loadSite() {
	try {
		const res = await fetch("site.json", { cache: "no-cache" });
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}

function params() {
	return new URLSearchParams(location.search);
}

function go(view, extra = {}) {
	const url = new URL(location.href);
	url.searchParams.set("view", view);
	for (const [k, v] of Object.entries(extra)) {
		if (v == null) url.searchParams.delete(k);
		else url.searchParams.set(k, v);
	}
	history.pushState(null, "", url);
	route();
}

/* ---------------- canvas view ---------------- */

function buildAttachments(canvas) {
	const map = {};
	for (const node of canvas.nodes ?? []) {
		if (node.type !== "file" || !node.file) continue;
		if (/^[a-z][a-z0-9+.-]*:\/\//i.test(node.file)) continue;
		const base = node.file.split(/[\\/]/).pop();
		if (!base) continue;
		map[node.file] = `static/images/${encodeURIComponent(base)}`;
	}
	return map;
}

function selectCanvas(slug) {
	const entry =
		canvases.find((c) => c.slug === slug) ??
		canvases.find((c) => c.file === slug) ??
		canvases[0];
	if (!entry) return Promise.resolve();

	if (els.picker.value !== entry.slug) els.picker.value = entry.slug;
	els.openRaw.hidden = false;
	els.openRaw.textContent = ".canvas";
	els.openRaw.href = encodeURI(entry.file);
	document.title = `${entry.title} · lunarzone | stalhub.dev`;

	return loadCanvas(entry);
}

async function loadCanvas(entry) {
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

/* ---------------- doc view ---------------- */

function selectDoc(slug) {
	const entry =
		docs.find((d) => d.slug === slug) ??
		docs.find((d) => d.file === slug) ??
		docs[0];
	if (!entry) {
		showStatus("Документы не найдены", false);
		return Promise.resolve();
	}
	if (els.docPicker.value !== entry.slug) els.docPicker.value = entry.slug;
	els.openRaw.hidden = false;
	els.openRaw.textContent = ".md";
	els.openRaw.href = encodeURI(entry.file);
	document.title = `${entry.title} · lunarzone`;
	return loadDoc(entry);
}

async function loadDoc(entry) {
	showStatus(`Загрузка «${entry.title}»…`);
	try {
		const res = await fetch(encodeURI(entry.file), { cache: "no-cache" });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		const text = await res.text();
		const { html, toc } = renderMarkdown(text);
		els.doc.innerHTML = html;
		renderToc(toc);
		els.main.scrollTop = 0;
		hideStatus();
	} catch (err) {
		console.error(err);
		showStatus(`Не удалось загрузить документ: ${err.message}`, false);
	}
}

/* ---------------- table of contents ---------------- */

let tocObserver = null;

function renderToc(toc) {
	if (tocObserver) {
		tocObserver.disconnect();
		tocObserver = null;
	}
	if (!toc || toc.length === 0) {
		els.tocNav.innerHTML = "";
		els.toc.hidden = true;
		els.tocToggle.hidden = true;
		return;
	}
	els.toc.hidden = false;
	els.tocToggle.hidden = false;
	els.toc.classList.remove("open");
	els.tocToggle.setAttribute("aria-expanded", "false");
	els.tocNav.innerHTML = toc
		.map(
			(h) =>
				`<a class="toc-link toc-l${h.level}" href="#${h.id}">${escapeHtml(h.title)}</a>`,
		)
		.join("");

	const links = [...els.tocNav.querySelectorAll("a")];
	const byId = new Map(links.map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
	for (const a of links) {
		a.addEventListener("click", (e) => {
			e.preventDefault();
			const target = document.getElementById(decodeURIComponent(a.hash.slice(1)));
			if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
			els.toc.classList.remove("open");
			els.tocToggle.setAttribute("aria-expanded", "false");
		});
	}

	const setActive = (id) => {
		for (const a of links) a.classList.remove("active");
		const a = byId.get(id);
		if (a) {
			a.classList.add("active");
			const nav = els.tocNav;
			const top = a.offsetTop - nav.clientHeight / 2;
			if (typeof nav.scrollTo === "function") nav.scrollTo({ top, behavior: "smooth" });
		}
	};

	if (typeof IntersectionObserver === "undefined") return;
	tocObserver = new IntersectionObserver(
		(entries) => {
			for (const entry of entries) {
				if (entry.isIntersecting) setActive(entry.target.id);
			}
		},
		{ root: els.main, rootMargin: "-15% 0px -75% 0px" },
	);
	els.doc.querySelectorAll("h1, h2, h3").forEach((h) => tocObserver.observe(h));
}

/* ---------------- lightbox ---------------- */

const lbState = { imgs: [], index: 0, capAlt: "", zoom: 1, panX: 0, panY: 0 };

const LB_ZMIN = 1;
const LB_ZMAX = 6;

function lbUpdateCaption() {
	const pct = lbState.zoom > 1 ? `  ·  ${Math.round(lbState.zoom * 100)}%` : "";
	els.lbCap.textContent =
		(lbState.capAlt ? `${lbState.capAlt}  ·  ` : "") +
		`${lbState.index + 1} / ${lbState.imgs.length}${pct}`;
}

function lbApplyZoom() {
	els.lbImg.style.transform =
		`translate(${lbState.panX}px, ${lbState.panY}px) scale(${lbState.zoom})`;
	els.lbImg.classList.toggle("zoomed", lbState.zoom > 1);
	lbUpdateCaption();
}

function lbZoomReset() {
	lbState.zoom = 1;
	lbState.panX = 0;
	lbState.panY = 0;
	lbApplyZoom();
}

function lbZoomBy(factor) {
	lbState.zoom = Math.min(LB_ZMAX, Math.max(LB_ZMIN, lbState.zoom * factor));
	if (lbState.zoom === 1) {
		lbState.panX = 0;
		lbState.panY = 0;
	}
	lbApplyZoom();
}

function lbShow(index) {
	const total = lbState.imgs.length;
	if (total === 0) return;
	lbState.index = ((index % total) + total) % total;
	const item = lbState.imgs[lbState.index];
	els.lbImg.src = item.src;
	els.lbImg.alt = item.alt;
	lbState.capAlt = item.alt;
	lbState.zoom = 1;
	lbState.panX = 0;
	lbState.panY = 0;
	lbApplyZoom();
	els.lb.hidden = false;
}

function lbClose() {
	els.lb.hidden = true;
	els.lbImg.removeAttribute("src");
}

function lbOpenFromDoc(imgEl) {
	const nodes = [...els.doc.querySelectorAll("img")];
	if (nodes.length === 0) return;
	lbState.imgs = nodes.map((img) => ({
		src: img.currentSrc || img.src,
		alt: img.alt || "",
	}));
	lbShow(Math.max(0, nodes.indexOf(imgEl)));
}

function initLightbox() {
	els.doc.addEventListener("click", (e) => {
		const img = e.target.closest("img");
		if (!img) return;
		lbOpenFromDoc(img);
	});
	els.lbClose.addEventListener("click", lbClose);
	els.lbPrev.addEventListener("click", (e) => {
		e.stopPropagation();
		lbShow(lbState.index - 1);
	});
	els.lbNext.addEventListener("click", (e) => {
		e.stopPropagation();
		lbShow(lbState.index + 1);
	});
	els.lbZoomIn.addEventListener("click", (e) => {
		e.stopPropagation();
		lbZoomBy(1.4);
	});
	els.lbZoomOut.addEventListener("click", (e) => {
		e.stopPropagation();
		lbZoomBy(1 / 1.4);
	});
	els.lbImg.addEventListener("dblclick", () => {
		if (lbState.zoom > 1) lbZoomReset();
		else {
			lbState.zoom = 2.5;
			lbApplyZoom();
		}
	});
	els.lbImg.addEventListener(
		"wheel",
		(e) => {
			e.preventDefault();
			lbZoomBy(e.deltaY < 0 ? 1.15 : 1 / 1.15);
		},
		{ passive: false },
	);
	let drag = null;
	els.lbImg.addEventListener("pointerdown", (e) => {
		if (lbState.zoom <= 1) return;
		drag = { x: e.clientX - lbState.panX, y: e.clientY - lbState.panY };
		els.lbImg.classList.add("dragging");
		els.lbImg.setPointerCapture(e.pointerId);
	});
	els.lbImg.addEventListener("pointermove", (e) => {
		if (!drag) return;
		lbState.panX = e.clientX - drag.x;
		lbState.panY = e.clientY - drag.y;
		lbApplyZoom();
	});
	const endDrag = () => {
		drag = null;
		els.lbImg.classList.remove("dragging");
	};
	els.lbImg.addEventListener("pointerup", endDrag);
	els.lbImg.addEventListener("pointercancel", endDrag);
	els.lb.addEventListener("click", (e) => {
		if (e.target === els.lb) lbClose();
	});
	document.addEventListener("keydown", (e) => {
		if (els.lb.hidden) return;
		if (e.key === "Escape") lbClose();
		else if (e.key === "ArrowLeft") lbShow(lbState.index - 1);
		else if (e.key === "ArrowRight") lbShow(lbState.index + 1);
	});
}

/* ---------------- home view ---------------- */

function formatBytes(n) {
	if (n == null) return "";
	const units = ["Б", "КБ", "МБ", "ГБ"];
	let v = n;
	let u = 0;
	while (v >= 1024 && u < units.length - 1) {
		v /= 1024;
		u++;
	}
	return `${v >= 10 || u === 0 ? Math.round(v) : v.toFixed(1)} ${units[u]}`;
}

function renderHome() {
	document.title = "lunarzone | stalhub.dev";
	els.openRaw.hidden = true;

	const doc = docs[0];
	const canvas = canvases[0];
	let cards = "";
	if (doc) {
		cards += `<a class="card" href="?view=doc&doc=${encodeURIComponent(doc.slug)}">
			<h3 class="card-tag">Досье</h3>
			<p>Полное досье: хронология конфликта, инфраструктура, атаки, таймлайн и разбор переписки. Скриншоты, логи и экспорты чатов приложены.</p>
			<span class="card-link">Читать →</span>
		</a>`;
	}
	if (canvas) {
		cards += `<a class="card" href="?view=canvas&canvas=${encodeURIComponent(canvas.slug)}">
			<h3 class="card-tag">Канвас</h3>
			<p>Визуальная схема расследования.</p>
			<span class="card-link">Открыть схему →</span>
		</a>`;
	}
	els.homeCards.innerHTML = cards;

	if (siteFiles.logs.length > 0) {
		els.homeLogs.innerHTML =
			'<h4>Логи</h4><ul class="file-list">' +
			siteFiles.logs
				.map(
					(f) =>
						`<li><a href="${encodeURI(f.file)}" target="_blank" rel="noopener">${escapeHtml(f.file.split("/").pop())}</a> <span class="file-size">${escapeHtml(formatBytes(f.size))}</span></li>`,
				)
				.join("") +
			"</ul>";
	} else {
		els.homeLogs.innerHTML = "";
	}

	if (siteFiles.exports.length > 0) {
		els.homeExports.innerHTML =
			'<h4>Экспорты чатов</h4><ul class="file-list">' +
			siteFiles.exports
				.map(
					(f) =>
						`<li><a href="${encodeURI(f.file)}">${escapeHtml(f.file.split("/").pop())}</a> <span class="file-size">${escapeHtml(formatBytes(f.size))}</span></li>`,
				)
				.join("") +
			"</ul>";
	} else {
		els.homeExports.innerHTML = "";
	}
}

/* ---------------- router ---------------- */

function setView(name) {
	els.home.hidden = name !== "home";
	els.docWrap.hidden = name !== "doc";
	els.viewer.hidden = name !== "canvas";
	for (const a of document.querySelectorAll(".nav-link")) {
		a.classList.toggle("active", a.dataset.nav === name);
	}
	els.docPicker.hidden = name !== "doc" || docs.length <= 1;
	els.picker.hidden = name !== "canvas" || canvases.length <= 1;
}

function route() {
	const p = params();
	let view = p.get("view");
	const legacyCanvas = p.get("canvas");
	if (!view && legacyCanvas) view = "canvas";
	if (view !== "doc" && view !== "canvas") view = "home";

	if (view === "doc" && docs.length === 0) view = "home";
	if (view === "canvas" && canvases.length === 0) {
		showStatus("Canvas-файлы не найдены", false);
		view = "home";
	}

	setView(view);
	if (view === "doc") {
		if (els.navDoc && docs[0]) {
			els.navDoc.href = `?view=doc&doc=${encodeURIComponent(docs[0].slug)}`;
		}
		return selectDoc(p.get("doc"));
	}
	if (view === "canvas") {
		if (els.navCanvas && canvases[0]) {
			els.navCanvas.href = `?view=canvas&canvas=${encodeURIComponent(canvases[0].slug)}`;
		}
		return selectCanvas(legacyCanvas ?? p.get("canvas"));
	}
	renderHome();
	hideStatus();
	return Promise.resolve();
}

/* ---------------- init ---------------- */

async function init() {
	refreshIcons();
	applyTheme(preferredTheme());
	els.themeToggle.addEventListener("click", () => {
		applyTheme(
			document.documentElement.dataset.theme === "dark" ? "light" : "dark",
		);
	});

	const setNavOpen = (open) => {
		els.nav.classList.toggle("open", open);
		els.navToggle.innerHTML = icon(open ? "x" : "menu", 20);
		els.navToggle.setAttribute("aria-expanded", String(open));
		els.navToggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
	};
	els.navToggle.addEventListener("click", () => {
		setNavOpen(!els.nav.classList.contains("open"));
	});
	els.tocToggle.addEventListener("click", () => {
		const open = els.toc.classList.toggle("open");
		els.tocToggle.setAttribute("aria-expanded", String(open));
	});
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape" && els.toc.classList.contains("open")) {
			els.toc.classList.remove("open");
			els.tocToggle.setAttribute("aria-expanded", "false");
		}
		if (e.key === "Escape" && els.nav.classList.contains("open")) {
			setNavOpen(false);
		}
	});
	window.addEventListener("resize", () => {
		if (window.innerWidth > 800 && els.nav.classList.contains("open")) {
			setNavOpen(false);
		}
	});
	initLightbox();

	try {
		canvases = await loadManifest();
	} catch (err) {
		console.warn(err);
		canvases = [];
	}
	docs = await loadDocs();
	const site = await loadSite();
	if (site) {
		if (Array.isArray(site.logs)) siteFiles.logs = site.logs;
		if (Array.isArray(site.exports)) siteFiles.exports = site.exports;
	}

	for (const entry of docs) {
		const option = document.createElement("option");
		option.value = entry.slug;
		option.textContent = entry.title;
		els.docPicker.appendChild(option);
	}
	for (const entry of canvases) {
		const option = document.createElement("option");
		option.value = entry.slug;
		option.textContent = entry.title;
		els.picker.appendChild(option);
	}
	if (docs[0])
		els.navDoc.href = `?view=doc&doc=${encodeURIComponent(docs[0].slug)}`;
	if (canvases[0]) {
		els.navCanvas.href = `?view=canvas&canvas=${encodeURIComponent(canvases[0].slug)}`;
	}

	els.docPicker.addEventListener("change", () =>
		go("doc", { doc: els.docPicker.value, canvas: null }),
	);
	els.picker.addEventListener("change", () =>
		go("canvas", { canvas: els.picker.value, doc: null }),
	);
	for (const a of document.querySelectorAll(".nav-link")) {
		a.addEventListener("click", (e) => {
			e.preventDefault();
			setNavOpen(false);
			const url = new URL(a.href);
			history.pushState(null, "", url);
			route();
		});
	}

	window.addEventListener("popstate", () => route());

	route();
}

if (typeof window !== "undefined") {
	init();
}

export { escapeHtml, headingSlug, renderMarkdown };
