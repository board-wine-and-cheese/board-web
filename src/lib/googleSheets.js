const tableCache = new Map();

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let value = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      value += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(value);
      value = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }

      row.push(value);
      value = '';

      if (row.some((cell) => String(cell || '').trim() !== '')) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    value += char;
  }

  row.push(value);

  if (row.some((cell) => String(cell || '').trim() !== '')) {
    rows.push(row);
  }

  return rows;
}

function cleanHeader(header) {
  return String(header || '')
    .trim()
    .replace(/^\uFEFF/, '');
}

function cleanValue(value) {
  const trimmed = String(value ?? '').trim();

  if (/^(true|yes|y|on)$/i.test(trimmed)) {
    return true;
  }

  if (/^(false|no|n|off)$/i.test(trimmed)) {
    return false;
  }

  return trimmed;
}

export function isVisibleRow(row) {
  if (!row || row.visible === undefined || row.visible === '') {
    return true;
  }

  if (typeof row.visible === 'boolean') {
    return row.visible;
  }

  return !/^(false|no|n|off|0)$/i.test(String(row.visible).trim());
}

export function sortBySortOrder(rows) {
  return [...rows].sort((a, b) => {
    const aSort = Number(a.sortOrder || 9999);
    const bSort = Number(b.sortOrder || 9999);
    return aSort - bSort;
  });
}

export function visibleRows(rows) {
  return sortBySortOrder((rows || []).filter(isVisibleRow));
}

export async function loadTable(url, { force = false } = {}) {
  if (!url) {
    return [];
  }

  if (!force && tableCache.has(url)) {
    return tableCache.get(url);
  }

  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Unable to load Google Sheet table: ${response.status}`);
  }

  const csvText = await response.text();
  const parsedRows = parseCsv(csvText);

  if (!parsedRows.length) {
    tableCache.set(url, []);
    return [];
  }

  const headers = parsedRows[0].map(cleanHeader);
  const dataRows = parsedRows.slice(1).map((cells) => {
    const row = {};

    headers.forEach((header, index) => {
      if (header) {
        row[header] = cleanValue(cells[index]);
      }
    });

    return row;
  });

  const nonEmptyRows = dataRows.filter((row) =>
    Object.values(row).some((value) => value !== '')
  );

  tableCache.set(url, nonEmptyRows);
  return nonEmptyRows;
}
