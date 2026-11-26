/** Resolve declared Raw provenance without reading Clipping bodies or granting access. */
import fs from 'node:fs';
import path from 'node:path';

function unquote(value) {
  const text = value.trim();
  if (text.startsWith('"')) return JSON.parse(text);
  if (text.startsWith("'")) {
    if (!text.endsWith("'")) throw Error('invalid_source_clipping');
    return text.slice(1, -1).replaceAll("''", "'");
  }
  return text;
}

function values(text) {
  const meta = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text)?.[1] ?? '';
  const fields = [...meta.matchAll(/^source_clipping:[ \t]*(.*)$/gm)];
  if (!fields.length) return [];
  if (fields.length !== 1) throw Error('ambiguous_source_clipping');
  const field = fields[0], inline = field[1].trim();
  if (!inline) {
    const rest = meta.slice(field.index + field[0].length).replace(/^\r?\n/, '');
    const block = /^(?:[ \t]*-[^\n]*(?:\n|$))*/.exec(rest)[0];
    return [...block.matchAll(/^[ \t]*-[ \t]+(.+)$/gm)].map(match => unquote(match[1]));
  }
  if (!inline.startsWith('[') || inline.startsWith('[[')) return [unquote(inline)];
  if (!inline.endsWith(']')) throw Error('invalid_source_clipping');
  const result = [];
  let start = 1, quote = null, depth = 0;
  for (let index = 1; index < inline.length - 1; index++) {
    const char = inline[index];
    if (quote) {
      if (quote === '"' && char === '\\') { index++; continue; }
      if (char === quote) {
        if (quote === "'" && inline[index + 1] === "'") index++;
        else quote = null;
      }
    } else if (char === '"' || char === "'") quote = char;
    else if (char === '[') depth++;
    else if (char === ']') depth--;
    else if (char === ',' && depth === 0) {
      result.push(unquote(inline.slice(start, index)));
      start = index + 1;
    }
    if (depth < 0) throw Error('invalid_source_clipping');
  }
  if (quote || depth) throw Error('invalid_source_clipping');
  const last = inline.slice(start, -1).trim();
  if (last) result.push(unquote(last));
  return result;
}

function referencesInScalar(value) {
  const links = [...value.matchAll(/\[\[([^\[\]]+)\]\]/g)];
  if (!links.length) return [value];
  if (!/^[\s;,；、+，]*$/.test(value.replace(/\[\[([^\[\]]+)\]\]/g, ''))) throw Error('invalid_source_clipping');
  return links.map(link => link[1]);
}

function target(reference) {
  if (typeof reference !== 'string') throw Error('invalid_source_clipping');
  let value = reference.trim();
  if (value.startsWith('[[') && value.endsWith(']]')) value = value.slice(2, -2);
  value = value.split(/[|#]/, 1)[0].trim();
  if (!value || /[\\:\x00-\x1f\[\]|#]/.test(value) || /%[a-f0-9]{2}/i.test(value) || value.startsWith('/') ||
      value.split('/').some(part => !part || part === '.' || part === '..')) throw Error('invalid_source_clipping');
  if (value.includes('/') && !value.startsWith('Clippings/')) throw Error('invalid_source_clipping');
  if (!/\.(md|txt)$/i.test(value)) value += '.md';
  return value;
}

/** Inventory includes inaccessible entries so a private duplicate cannot make a basename unique. */
export function resolveSourceClippings(text, inventory) {
  let references;
  try { references = values(text).flatMap(referencesInScalar); }
  catch (error) {
    return {paths: [], unavailable: [error.message === 'ambiguous_source_clipping' ? error.message : 'invalid_source_clipping']};
  }
  if (!references.length) return {paths: [], unavailable: []};
  let paths;
  try { paths = new Set(typeof inventory === 'function' ? inventory() : inventory); }
  catch { return {paths: [], unavailable: ['source_clipping_inventory_unavailable']}; }
  const resolved = [], unavailable = [];
  for (const reference of references) {
    if (/^https?:\/\//i.test(reference)) { unavailable.push('external_source_unavailable'); continue; }
    try {
      const name = target(reference);
      const matches = name.startsWith('Clippings/') ? (paths.has(name) ? [name] : []) :
        [...paths].filter(relative => relative.startsWith('Clippings/') && path.posix.basename(relative) === name);
      if (matches.length === 1) {
        if (target(matches[0]) !== matches[0]) throw Error('invalid_source_clipping');
        resolved.push(matches[0]);
      } else unavailable.push(matches.length ? 'ambiguous_source_clipping' : 'source_clipping_missing');
    } catch { unavailable.push('invalid_source_clipping'); }
  }
  return {paths: [...new Set(resolved)], unavailable: [...new Set(unavailable)]};
}

/** Metadata-only inventory. Symlinked files/directories cannot become provenance targets. */
export function clippingPaths(root) {
  const result = [];
  function visit(relative) {
    const full = path.join(root, relative);
    let rows;
    try {
      if (!fs.lstatSync(full).isDirectory()) return;
      rows = fs.readdirSync(full, {withFileTypes: true});
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    for (const row of rows) {
      const child = relative + '/' + row.name;
      if (row.isDirectory()) visit(child);
      else if (row.isFile()) result.push(child);
    }
  }
  visit('Clippings');
  return result.sort();
}
