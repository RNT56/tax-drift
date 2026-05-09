const crypto = require('node:crypto');

function stripBom(text) {
  return String(text || '').replace(/^\uFEFF/, '');
}

function detectDelimiter(header) {
  const counts = [';', ',', '\t'].map(delimiter => ({
    delimiter,
    count: String(header || '').split(delimiter).length - 1
  }));
  return counts.sort((a, b) => b.count - a.count)[0].delimiter || ',';
}

function parseDelimitedText(text, options = {}) {
  const raw = stripBom(text);
  const delimiter = options.delimiter || detectDelimiter(raw.split(/\r?\n/, 1)[0]);
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < raw.length; i += 1) {
    const ch = raw[i];
    const next = raw[i + 1];
    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (ch !== '\r') {
      cell += ch;
    }
  }
  row.push(cell);
  if (row.length > 1 || row[0]) rows.push(row);
  return rows;
}

function normalizeHeader(value) {
  return String(value || '').toLowerCase().trim().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

function parseNumber(value) {
  const cleaned = String(value || '')
    .trim()
    .replace(/[€$£]/g, '')
    .replace(/\s/g, '')
    .replace(/^\((.*)\)$/, '-$1');
  const comma = cleaned.lastIndexOf(',');
  const dot = cleaned.lastIndexOf('.');
  const normalized = comma > dot
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned.replace(/,/g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

function rowHash(tx) {
  return crypto.createHash('sha256')
    .update([tx.broker, tx.accountId, tx.tradeDate, tx.type, tx.symbol || tx.isin, tx.quantity, tx.grossAmount, tx.sourceRow || tx.sourceSpan || ''].join('|'))
    .digest('hex');
}

function rowsToObjects(rows) {
  const headers = (rows[0] || []).map(normalizeHeader);
  return rows.slice(1).filter(row => row.some(Boolean)).map((row, index) => {
    const obj = { sourceRow: index + 2 };
    headers.forEach((header, i) => { obj[header] = row[i] || ''; });
    return obj;
  });
}

function pick(row, names) {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

function normalizeGenericCsv(text, options = {}) {
  const rows = parseDelimitedText(text, options);
  const objects = rowsToObjects(rows);
  const detection = options.detection || detectBroker({ text, fileName: options.fileName, contentType: 'text/csv' });
  const mapping = options.mapping || {};
  const transactions = objects.map((row) => {
    const typeRaw = pick(row, [mapping.type, 'type', 'transaction type', 'aktion', 'typ', 'side']);
    const type = /sell|verkauf/i.test(typeRaw) ? 'SELL' : /buy|kauf/i.test(typeRaw) ? 'BUY' : String(typeRaw || 'UNKNOWN').toUpperCase();
    const tx = {
      id: '',
      sourceRow: row.sourceRow,
      broker: options.broker || detection.broker || 'generic',
      accountId: options.accountId || '',
      symbol: pick(row, [mapping.symbol, 'symbol', 'ticker', 'wertpapier']),
      isin: pick(row, [mapping.isin, 'isin']),
      name: pick(row, [mapping.name, 'name', 'instrument', 'description']),
      tradeDate: pick(row, [mapping.tradeDate, 'trade date', 'date', 'datum']),
      settlementDate: pick(row, [mapping.settlementDate, 'settlement date', 'valuta']),
      type,
      quantity: parseNumber(pick(row, [mapping.quantity, 'quantity', 'shares', 'stück', 'stueck', 'anzahl'])),
      price: parseNumber(pick(row, [mapping.price, 'price', 'kurs'])),
      grossAmount: parseNumber(pick(row, [mapping.grossAmount, 'amount', 'gross amount', 'betrag'])),
      fees: parseNumber(pick(row, [mapping.fees, 'fees', 'fee', 'kosten', 'gebühr'])),
      taxes: parseNumber(pick(row, [mapping.taxes, 'tax', 'taxes', 'steuer'])),
      currency: String(pick(row, [mapping.currency, 'currency', 'währung', 'waehrung']) || options.currency || 'EUR').toUpperCase().slice(0, 3),
      notes: '',
      warnings: [],
      errors: []
    };
    tx.id = rowHash(tx);
    if (!tx.symbol && !tx.isin) tx.warnings.push('Missing symbol/ISIN.');
    if (!Number.isFinite(tx.quantity)) tx.errors.push('Missing quantity.');
    return tx;
  });
  return {
    detectedBroker: options.broker || detection.broker || 'generic-csv',
    adapter: detection.adapter || 'generic-csv',
    confidence: options.broker ? 0.75 : detection.confidence,
    reason: detection.reason,
    mappingRequired: detection.confidence < 0.5,
    rowCount: objects.length,
    transactions,
    symbols: [...new Set(transactions.map(tx => tx.isin || tx.symbol).filter(Boolean))],
    dateRange: {
      from: transactions.map(tx => tx.tradeDate).filter(Boolean).sort()[0] || null,
      to: transactions.map(tx => tx.tradeDate).filter(Boolean).sort().slice(-1)[0] || null
    },
    warnings: [],
    errors: []
  };
}

function detectBroker({ text = '', fileName = '', contentType = '' } = {}) {
  const sample = `${fileName}\n${String(text || '').slice(0, 5000)}`.toLowerCase();
  const isPdf = String(contentType).toLowerCase().includes('pdf') || /\.pdf$/i.test(fileName);
  if (/trade\s*republic|traderepublic/.test(sample)) {
    return { broker: 'trade-republic', adapter: isPdf ? 'trade-republic-pdf' : 'trade-republic-csv', confidence: 0.9, reason: 'Trade Republic marker found.' };
  }
  if (/scalable\s*capital|baader\s*bank/.test(sample)) {
    return { broker: 'scalable-capital', adapter: isPdf ? 'scalable-pdf' : 'scalable-csv', confidence: 0.88, reason: 'Scalable Capital/Baader marker found.' };
  }
  if (/interactive\s*brokers|ibkr|flex\s+query/.test(sample)) {
    return { broker: 'interactive-brokers', adapter: 'ibkr-csv', confidence: 0.82, reason: 'Interactive Brokers marker found.' };
  }
  return { broker: isPdf ? 'unknown-pdf' : 'generic-csv', adapter: isPdf ? 'unknown-pdf' : 'generic-csv', confidence: isPdf ? 0.2 : 0.45, reason: isPdf ? 'No supported PDF broker marker found.' : 'Generic CSV fallback.' };
}

function normalizeDate(value) {
  const text = String(value || '').trim();
  const de = text.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (de) {
    const year = de[3].length === 2 ? `20${de[3]}` : de[3];
    return `${year.padStart(4, '0')}-${de[2].padStart(2, '0')}-${de[1].padStart(2, '0')}`;
  }
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  return iso ? iso[0] : text;
}

function findFirst(text, patterns) {
  for (const pattern of patterns) {
    const match = String(text || '').match(pattern);
    if (match) return match[1] || match[0];
  }
  return '';
}

function pdfTransactionType(text) {
  if (/dividende|ausschüttung|distribution/i.test(text)) return 'DIVIDEND';
  if (/verkauf|sell|sold/i.test(text)) return 'SELL';
  if (/kauf|buy|bought/i.test(text)) return 'BUY';
  if (/steuer|tax/i.test(text)) return 'TAX';
  if (/gebühr|fee|kosten/i.test(text)) return 'FEE';
  return 'UNKNOWN';
}

function parseBrokerPdfText(text, options = {}) {
  const detection = options.detection || detectBroker({ text, fileName: options.fileName, contentType: 'application/pdf' });
  if (detection.adapter === 'unknown-pdf') {
    return {
      detectedBroker: detection.broker,
      adapter: detection.adapter,
      confidence: detection.confidence,
      reason: detection.reason,
      rowCount: 0,
      transactions: [],
      symbols: [],
      dateRange: { from: null, to: null },
      warnings: [],
      errors: ['Unsupported broker PDF.']
    };
  }
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  const isin = findFirst(compact, [/\b([A-Z]{2}[A-Z0-9]{9}\d)\b/]);
  const type = pdfTransactionType(compact);
  const date = normalizeDate(findFirst(compact, [
    /(?:Ausführungstag|Handelstag|Datum|Valuta|Execution date|Trade date)\s*:?\s*(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})/
  ]));
  const quantity = parseNumber(findFirst(compact, [
    /(?:Stück|Stueck|Anzahl|Quantity|Qty)\s*:?\s*([-\d.,]+)/i,
    /([-\d.,]+)\s*(?:Stück|Stueck|shares?)/i
  ]));
  const price = parseNumber(findFirst(compact, [
    /(?:Kurs|Preis|Price)\s*:?\s*([-\d.,]+)/i,
    /(?:Ausführungskurs|Execution price)\s*:?\s*([-\d.,]+)/i
  ]));
  const grossAmount = parseNumber(findFirst(compact, [
    /(?:Betrag|Amount|Ordervolumen|Gesamt)\s*:?\s*([-\d.,]+)/i,
    /([-\d.,]+)\s*(?:EUR|USD|CHF|GBP)\s*(?:Gesamt|Total)?/i
  ]));
  const fees = parseNumber(findFirst(compact, [/(?:Gebühr|Gebühren|Kosten|Fees?)\s*:?\s*([-\d.,]+)/i]));
  const taxes = parseNumber(findFirst(compact, [/(?:Steuer|Kapitalertragsteuer|Taxes?)\s*:?\s*([-\d.,]+)/i]));
  const currency = findFirst(compact, [/\b(EUR|USD|CHF|GBP)\b/]) || options.currency || 'EUR';
  const name = findFirst(compact, [
    /(?:Wertpapier|Instrument|Security)\s*:?\s*([A-Z0-9 .,&-]{3,80})/i,
    /\b(?:Kauf|Verkauf|Buy|Sell)\s+([A-Z0-9 .,&-]{3,80}?)\s+(?:ISIN|WKN|\b[A-Z]{2}[A-Z0-9]{9}\d\b)/i
  ]);
  const tx = {
    id: '',
    sourceRow: 1,
    sourceSpan: 'pdf:1',
    broker: detection.broker,
    accountId: options.accountId || '',
    symbol: '',
    isin,
    name,
    tradeDate: date,
    settlementDate: '',
    type,
    quantity,
    price,
    grossAmount,
    fees,
    taxes,
    currency: String(currency).toUpperCase().slice(0, 3),
    notes: '',
    warnings: [],
    errors: []
  };
  tx.id = rowHash(tx);
  if (!isin) tx.warnings.push('Missing ISIN.');
  if (type === 'UNKNOWN') tx.errors.push('Unsupported PDF transaction type.');
  if (!Number.isFinite(quantity) && !['DIVIDEND', 'FEE', 'TAX'].includes(type)) tx.errors.push('Missing quantity.');
  if (!Number.isFinite(price) && ['BUY', 'SELL'].includes(type)) tx.warnings.push('Missing execution price.');

  return {
    importId: options.importId,
    detectedBroker: detection.broker,
    adapter: detection.adapter,
    confidence: detection.confidence,
    reason: detection.reason,
    mappingRequired: false,
    rowCount: 1,
    transactions: [tx],
    symbols: [isin].filter(Boolean),
    dateRange: { from: date || null, to: date || null },
    warnings: tx.warnings.slice(),
    errors: []
  };
}

async function parseImportBuffer(buffer, options = {}) {
  const contentType = String(options.contentType || '').toLowerCase();
  const fileName = String(options.fileName || '').toLowerCase();
  if (contentType.includes('pdf') || fileName.endsWith('.pdf')) {
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch {
      return { detectedBroker: 'pdf', confidence: 0, rowCount: 0, transactions: [], symbols: [], warnings: [], errors: ['PDF parsing dependency is not installed.'] };
    }
    const parsed = await pdfParse(buffer);
    const text = parsed.text || '';
    if (!text.trim()) return { detectedBroker: 'pdf', adapter: 'pdf', confidence: 0, rowCount: 0, transactions: [], symbols: [], warnings: [], errors: ['unsupported_scanned_pdf: Scanned/image-only PDFs are not supported.'] };
    return parseBrokerPdfText(text, { ...options, detection: detectBroker({ text, fileName, contentType }) });
  }
  const text = buffer.toString('utf8');
  return normalizeGenericCsv(text, { ...options, detection: detectBroker({ text, fileName, contentType }) });
}

module.exports = { parseDelimitedText, normalizeGenericCsv, parseImportBuffer, parseBrokerPdfText, detectBroker, parseNumber, rowHash };
