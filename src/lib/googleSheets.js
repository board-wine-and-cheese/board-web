const tableCache = new Map();

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];
    if (char === '"' && inQuotes && nextChar === '"') { value += '"'; index += 1; continue; }
    if (char === '"') { inQuotes = !inQuotes; continue; }
    if (char === ',' && !inQuotes) { row.push(value); value = ''; continue; }
    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(value); value = '';
      if (row.some((cell) => String(cell || '').trim() !== '')) rows.push(row);
      row = [];
      continue;
    }
    value += char;
  }
  row.push(value);
  if (row.some((cell) => String(cell || '').trim() !== '')) rows.push(row);
  return rows;
}

const HEADER_ALIASES = {
  subtitle: 'subtitle', sub_title: 'subtitle',
  mediaurl: 'mediaURL', media_url: 'mediaURL',
  mediaurl2: 'mediaURL2', media_url_2: 'mediaURL2',
  mediaurl3: 'mediaURL3', media_url_3: 'mediaURL3',
  cloudinaryurl: 'cloudinaryURL',
  sortorder: 'sortOrder', sort_order: 'sortOrder',
  artisturl: 'artistURL', artist_url: 'artistURL',
  websiteurl: 'websiteURL', website_url: 'websiteURL',
  spotifyurl: 'spotifyURL', spotify_url: 'spotifyURL',
  buttontext: 'buttonText', button_text: 'buttonText',
  pdfurl: 'pdfURL', pdf_url: 'pdfURL',
};

function cleanHeader(header) {
  const raw = String(header || '').trim().replace(/^\uFEFF/, '');
  const key = raw.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  return HEADER_ALIASES[key] || raw;
}

function cleanValue(value) {
  const trimmed = String(value ?? '').trim();
  if (/^(true|yes|y|on)$/i.test(trimmed)) return true;
  if (/^(false|no|n|off)$/i.test(trimmed)) return false;
  return trimmed;
}

export function isVisibleRow(row) {
  if (!row || row.visible === undefined || row.visible === '') return true;
  if (typeof row.visible === 'boolean') return row.visible;
  return !/^(false|no|n|off|0)$/i.test(String(row.visible).trim());
}

export function sortBySortOrder(rows) {
  return [...rows].sort((a, b) => Number(a.sortOrder || 9999) - Number(b.sortOrder || 9999));
}

export function visibleRows(rows) {
  return sortBySortOrder((rows || []).filter(isVisibleRow));
}

export async function loadTable(url, { force = false } = {}) {
  if (!url || !/^https:\/\//i.test(url)) throw new Error(`Invalid Google Sheet CSV URL: ${url || '(empty)'}`);
  if (!force && tableCache.has(url)) return tableCache.get(url);

  const separator = url.includes('?') ? '&' : '?';
  const response = await fetch(`${url}${separator}_=${Date.now()}`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load Google Sheet table: ${response.status}`);

  const csvText = await response.text();
  if (/^\s*<!doctype html|^\s*<html/i.test(csvText)) throw new Error('Google returned HTML instead of CSV. Republish this tab as CSV.');

  const parsedRows = parseCsv(csvText);
  if (!parsedRows.length) return [];
  const headers = parsedRows[0].map(cleanHeader);
  const dataRows = parsedRows.slice(1).map((cells) => {
    const row = {};
    headers.forEach((header, index) => { if (header) row[header] = cleanValue(cells[index]); });
    return row;
  }).filter((row) => Object.values(row).some((value) => value !== ''));

  tableCache.set(url, dataRows);
  return dataRows;
}
