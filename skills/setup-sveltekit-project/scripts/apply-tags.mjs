#!/usr/bin/env node
// Resolves the conditional markers in copied templates, in place.
//
//   node apply-tags.mjs --tags auth,db,db-postgresql,... <dir-or-file>...
//
// Markers (an expression is `tag`, `!tag`, `a,b` = all of them, or `a|b` = any of them):
//   first line `// #file-if <expr>` (or `<!-- #file-if <expr> -->`): delete the file unless it holds
//   a line ending in `// @if <expr>`: keep the line (minus the marker) only if it holds
//   `// #if <expr>` ... `// #else` ... `// #endif` (or the `<!-- … -->` forms): blocks, nestable
// Marker lines themselves are always removed. Runs of blank lines left behind collapse to one.

import { readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

// Setup answers map to tags; `--tags a,b` adds raw ones.
const USAGE =
	'usage: apply-tags.mjs --db none|postgresql|mysql|sqlite --auth none|username|phone-password|phone-otp|email --roles none|hardcoded|db --demo yes|no [--tags a,b] <dir-or-file>...';
const CHOICES = {
	db: ['none', 'postgresql', 'mysql', 'sqlite'],
	auth: ['none', 'username', 'phone-password', 'phone-otp', 'email'],
	roles: ['none', 'hardcoded', 'db'],
	demo: ['yes', 'no']
};

const args = process.argv.slice(2);
const options = {};
const targets = [];
for (let i = 0; i < args.length; i++) {
	const flag = /^--(db|auth|roles|demo|tags)$/.exec(args[i]);
	if (flag) options[flag[1]] = args[++i];
	else targets.push(args[i]);
}
for (const [key, allowed] of Object.entries(CHOICES)) {
	if (!allowed.includes(options[key])) {
		console.error(`--${key} must be one of: ${allowed.join(', ')}\n${USAGE}`);
		process.exit(1);
	}
}
if (options.db === 'none' && options.auth !== 'none') {
	console.error('--auth needs a database');
	process.exit(1);
}
if (options.auth === 'none' && options.roles !== 'none') {
	console.error('--roles needs --auth');
	process.exit(1);
}
if (!targets.length) {
	console.error(USAGE);
	process.exit(1);
}

const tags = new Set((options.tags ?? '').split(',').map((tag) => tag.trim()).filter(Boolean));
if (options.db !== 'none') tags.add('db').add(`db-${options.db}`);
if (options.auth !== 'none') tags.add('auth').add(`login-${options.auth}`);
if (options.auth === 'username') tags.add('username').add('two-factor');
if (['username', 'phone-password', 'phone-otp'].includes(options.auth)) tags.add('phone');
if (options.roles !== 'none') tags.add('permissions').add(`roles-${options.roles}`);
if (options.demo === 'yes') tags.add('demo');
console.log(`apply-tags: ${[...tags].sort().join(', ') || '(no tags)'}`);

const EXTENSIONS = new Set(['.ts', '.js', '.mjs', '.svelte', '.md', '.css', '.json', '.html']);

const holds = (expr) => {
	const term = (t) => (t.startsWith('!') ? !tags.has(t.slice(1)) : tags.has(t));
	if (expr.includes('|')) return expr.split('|').map((t) => t.trim()).some(term);
	return expr.split(',').map((t) => t.trim()).every(term);
};

const directive = (line) => {
	const m = /^\s*(?:\/\/|<!--)\s*#(file-if|if|else|endif)\b\s*([^>]*?)\s*(?:-->)?\s*$/.exec(line);
	return m ? { kind: m[1], expr: m[2] } : null;
};
const inline = /\s*(?:\/\/|<!--)\s*@if\s+([^\s>]+)\s*(?:-->)?\s*$/;

let removed = 0;
let changed = 0;

const processFile = (path) => {
	if (!EXTENSIONS.has(extname(path))) return;
	const source = readFileSync(path, 'utf8');
	if (!/#(file-if|if|else|endif)\b|@if\s/.test(source)) return;

	const lines = source.split(/\r?\n/);
	const first = directive(lines[0] ?? '');
	if (first?.kind === 'file-if') {
		if (!holds(first.expr)) {
			unlinkSync(path);
			removed++;
			return;
		}
		lines.shift();
	}

	const out = [];
	const stack = []; // each: { active, parentActive }
	const active = () => stack.every((frame) => frame.active);
	for (const line of lines) {
		const d = directive(line);
		if (d?.kind === 'if') {
			stack.push({ active: holds(d.expr), parentActive: active() });
			continue;
		}
		if (d?.kind === 'else') {
			const frame = stack.at(-1);
			if (!frame) throw new Error(`${path}: #else without #if`);
			frame.active = !frame.active;
			continue;
		}
		if (d?.kind === 'endif') {
			if (!stack.pop()) throw new Error(`${path}: #endif without #if`);
			continue;
		}
		if (!active()) continue;

		const m = inline.exec(line);
		if (m) {
			if (holds(m[1])) out.push(line.replace(inline, ''));
			continue;
		}
		out.push(line);
	}
	if (stack.length) throw new Error(`${path}: unclosed #if`);

	const text = out.join('\n').replace(/\n{3,}/g, '\n\n');
	writeFileSync(path, text);
	changed++;
};

const walk = (path) => {
	const stat = statSync(path);
	if (stat.isDirectory()) {
		for (const entry of readdirSync(path)) {
			if (entry === 'node_modules' || entry === '.git') continue;
			walk(join(path, entry));
		}
	} else processFile(path);
};

for (const target of targets) walk(target);
console.log(`apply-tags: ${changed} file(s) resolved, ${removed} file(s) removed`);
