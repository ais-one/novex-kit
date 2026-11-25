// Checks relative links in the repo's Markdown files: the target file must exist, and a
// `#anchor` must match a heading in the target file (GitHub slug rules) or an explicit
// `<a id="...">` / `<a name="...">`. External links (http:, mailto:, ...) are not checked.
//
// Usage: node scripts/check-doc-links.ts [file-or-folder ...]
//   no arguments: every Markdown file git knows about (tracked + untracked, minus .gitignore)
// Exits 1 if any link is broken.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

type Link = { line: number; target: string };

const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();

function listMarkdownFiles(args: string[]): string[] {
  const pathspecs = (args.length ? args : [repoRoot]).map(a => relative(repoRoot, resolve(process.cwd(), a)) || '.');
  const out = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...pathspecs], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return [...new Set(out.split('\n'))]
    .filter(f => f.endsWith('.md'))
    .map(f => resolve(repoRoot, f))
    .filter(f => existsSync(f));
}

/** Lines outside fenced code blocks, with inline code spans blanked out. */
function proseLines(text: string): Array<[number, string]> {
  const result: Array<[number, string]> = [];
  let fence: string | null = null;
  text.split('\n').forEach((raw, i) => {
    const marker = raw.match(/^\s*(```+|~~~+)/)?.[1];
    if (marker) {
      if (fence === null) fence = marker[0];
      else if (marker[0] === fence) fence = null;
      return;
    }
    if (fence === null) result.push([i + 1, raw.replace(/`[^`]*`/g, m => ' '.repeat(m.length))]);
  });
  return result;
}

/** GitHub heading slug: lowercase, drop punctuation, spaces to hyphens. */
function slug(heading: string): string {
  return heading
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/<[^>]+>/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
    .replace(/ /g, '-');
}

const anchorCache = new Map<string, Set<string>>();

function anchorsOf(file: string): Set<string> {
  const cached = anchorCache.get(file);
  if (cached) return cached;
  const text = readFileSync(file, 'utf8');
  const anchors = new Set<string>();
  const seen = new Map<string, number>();
  let fence: string | null = null;
  for (const raw of text.split('\n')) {
    const marker = raw.match(/^\s*(```+|~~~+)/)?.[1];
    if (marker) {
      if (fence === null) fence = marker[0];
      else if (marker[0] === fence) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = raw.match(/^#{1,6}\s+(.*?)\s*#*\s*$/);
    if (heading) {
      const base = slug(heading[1]);
      const n = seen.get(base) ?? 0;
      seen.set(base, n + 1);
      anchors.add(n === 0 ? base : `${base}-${n}`);
    }
    for (const m of raw.matchAll(/<a\s+(?:id|name)="([^"]+)"/g)) anchors.add(m[1]);
  }
  anchorCache.set(file, anchors);
  return anchors;
}

function linksOf(file: string): Link[] {
  const links: Link[] = [];
  for (const [line, text] of proseLines(readFileSync(file, 'utf8'))) {
    // [text](target) and ![alt](target); the target may be <wrapped> and followed by a "title"
    for (const m of text.matchAll(/!?\[[^\]]*\]\(\s*(<[^>]*>|[^)\s]*)(?:\s+"[^"]*")?\s*\)/g)) {
      const target = m[1].replace(/^<|>$/g, '');
      if (target) links.push({ line, target });
    }
  }
  return links;
}

function check(file: string, link: Link): string | null {
  const { target } = link;
  if (/^[a-z][a-z0-9+.-]*:/i.test(target)) return null; // http:, https:, mailto:, ...

  const hashAt = target.indexOf('#');
  const pathPart = decodeURIComponent(hashAt === -1 ? target : target.slice(0, hashAt));
  const anchor = hashAt === -1 ? '' : decodeURIComponent(target.slice(hashAt + 1));

  const targetFile = pathPart === '' ? file : resolve(dirname(file), pathPart);
  if (!existsSync(targetFile)) return `missing file: ${target}`;
  if (!anchor) return null;
  if (statSync(targetFile).isDirectory() || !targetFile.endsWith('.md')) return null; // anchors only checked in Markdown
  if (!anchorsOf(targetFile).has(anchor)) return `missing anchor: ${target}`;
  return null;
}

const files = listMarkdownFiles(process.argv.slice(2));
let linkCount = 0;
let broken = 0;

for (const file of files) {
  for (const link of linksOf(file)) {
    linkCount += 1;
    const problem = check(file, link);
    if (problem) {
      broken += 1;
      console.error(`${relative(repoRoot, file)}:${link.line}: ${problem}`);
    }
  }
}

console.log(`Checked ${linkCount} links in ${files.length} Markdown files: ${broken} broken.`);
process.exit(broken ? 1 : 0);
