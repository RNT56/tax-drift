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

function positionHash(position) {
  return crypto.createHash('sha256')
    .update([position.broker, position.accountId, position.snapshotDate, position.symbol || position.isin, position.shares, position.currentPrice, position.costBasis, position.sourceRow || ''].join('|'))
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

function headerLabels(rows) {
  return (rows[0] || []).map(value => String(value || '').trim()).filter(Boolean);
}

function pick(row, names) {
  for (const name of names) {
    const key = normalizeHeader(name);
    if (row[key] !== undefined && row[key] !== '') return row[key];
  }
  return '';
}

const FIELD_ALIASES = {
  type: ['type', 'transaction type', 'aktion', 'typ', 'side', 'umsatzart', 'buchungstext', 'geschäftsart', 'geschaeftsart', 'order typ', 'ordertype', 'art'],
  quantity: ['quantity', 'shares', 'stück', 'stueck', 'anzahl', 'nominal', 'nominale', 'stueck nominal', 'stück nominal', 'anteile'],
  price: ['price', 'kurs', 'ausführungskurs', 'ausfuehrungskurs', 'execution price', 'preis', 'abrechnungskurs'],
  grossAmount: ['amount', 'gross amount', 'betrag', 'total', 'kurswert', 'orderwert', 'ordervolumen', 'gegenwert', 'bruttobetrag'],
  fees: ['fees', 'fee', 'kosten', 'gebühr', 'gebuehr', 'provision', 'entgelt', 'spesen'],
  taxes: ['tax', 'taxes', 'steuer', 'steuern', 'kapitalertragsteuer', 'abgeltungsteuer'],
  currency: ['currency', 'währung', 'waehrung', 'whg', 'devisen', 'kurswährung', 'kurswaehrung'],
  symbol: ['symbol', 'ticker', 'wertpapier', 'kurzbezeichnung'],
  isin: ['isin', 'wkn isin', 'isin wkn'],
  name: ['name', 'instrument', 'description', 'wertpapiername', 'bezeichnung', 'wertpapierbezeichnung', 'titel'],
  tradeDate: ['trade date', 'date', 'datum', 'buchungstag', 'handelstag', 'ausführungstag', 'ausfuehrungstag', 'orderdatum'],
  settlementDate: ['settlement date', 'valuta', 'wertstellung'],
  accountId: ['account', 'account id', 'konto', 'kontonummer', 'depot', 'depotnummer', 'depot nr', 'depot-nr'],
  snapshotDate: ['snapshot date', 'stand', 'stichtag', 'bewertungsdatum', 'datum'],
  marketValue: ['market value', 'marktwert', 'wert', 'aktueller wert', 'positionswert', 'gesamtwert', 'depotwert'],
  costBasis: ['cost basis', 'einstandswert', 'einstandswert gesamt', 'kaufwert', 'anschaffungswert', 'investiert', 'gesamt einstand'],
  buyPrice: ['buy price', 'einstandskurs', 'kaufkurs', 'durchschnittskurs', 'durchschnittlicher kaufkurs', 'avg price', 'average price'],
  currentPrice: ['current price', 'aktueller kurs', 'kurs aktuell', 'bewertungskurs', 'kurs', 'preis'],
  profitLoss: ['profit loss', 'gewinn verlust', 'guv', 'performance', 'entwicklung']
};

function aliases(field, mapping = {}) {
  return [mapping[field], ...(FIELD_ALIASES[field] || [])].filter(Boolean);
}

function resolveFieldMapping(labels, mapping = {}) {
  const normalizedHeaders = labels.map(normalizeHeader);
  const findColumn = (names) => {
    for (const name of names) {
      const key = normalizeHeader(name);
      const index = normalizedHeaders.indexOf(key);
      if (index >= 0 && labels[index]) return labels[index];
    }
    return '';
  };
  return Object.fromEntries(Object.keys(FIELD_ALIASES).map(field => [field, findColumn(aliases(field, mapping))]));
}

function classifyCsvImport(resolvedMapping, rows) {
  const hasTransactionShape = !!resolvedMapping.type || rows.some(row => /buy|kauf|sell|verkauf|dividend|dividende|ausschüttung|steuer|gebühr|fee/i.test(pick(row, aliases('type'))));
  const hasPositionShape = (!!resolvedMapping.marketValue || !!resolvedMapping.costBasis || !!resolvedMapping.currentPrice || !!resolvedMapping.buyPrice)
    && !!resolvedMapping.quantity
    && (!!resolvedMapping.symbol || !!resolvedMapping.isin || !!resolvedMapping.name);
  if (hasPositionShape && !hasTransactionShape) return 'positions';
  if (hasPositionShape && rows.some(row => !pick(row, aliases('type')))) return 'mixed';
  return 'transactions';
}

function normalizeTransactionType(value) {
  const text = String(value || '').trim();
  if (/sell|verkauf|veräußerung|veraeusserung/i.test(text)) return 'SELL';
  if (/buy|kauf|sparplan kauf|zeichnung/i.test(text)) return 'BUY';
  if (/dividend|dividende|ausschüttung|ausschuettung|ertrag/i.test(text)) return 'DIVIDEND';
  if (/tax|steuer/i.test(text)) return 'TAX';
  if (/fee|gebühr|gebuehr|kosten|entgelt/i.test(text)) return 'FEE';
  if (/einlieferung|übertrag eingang|uebertrag eingang|transfer in/i.test(text)) return 'TRANSFER_IN';
  if (/auslieferung|übertrag ausgang|uebertrag ausgang|transfer out/i.test(text)) return 'TRANSFER_OUT';
  return text ? text.toUpperCase() : 'UNKNOWN';
}

function normalizePositionRow(row, mapping, detection, options = {}) {
  const shares = parseNumber(pick(row, aliases('quantity', mapping)));
  const currentPrice = parseNumber(pick(row, aliases('currentPrice', mapping)));
  const buyPrice = parseNumber(pick(row, aliases('buyPrice', mapping)));
  const marketValue = parseNumber(pick(row, aliases('marketValue', mapping)));
  const costBasis = parseNumber(pick(row, aliases('costBasis', mapping)));
  const derivedPrice = Number.isFinite(currentPrice) ? currentPrice : (Number.isFinite(marketValue) && shares > 0 ? Math.abs(marketValue) / shares : NaN);
  const derivedBuyPrice = Number.isFinite(buyPrice) ? buyPrice : (Number.isFinite(costBasis) && shares > 0 ? Math.abs(costBasis) / shares : NaN);
  const position = {
    id: '',
    sourceRow: row.sourceRow,
    broker: options.broker || detection.broker || 'generic',
    accountId: options.accountId || pick(row, aliases('accountId', mapping)),
    symbol: pick(row, aliases('symbol', mapping)),
    isin: pick(row, aliases('isin', mapping)),
    name: pick(row, aliases('name', mapping)),
    snapshotDate: pick(row, aliases('snapshotDate', mapping)),
    shares,
    buyPrice: derivedBuyPrice,
    currentPrice: derivedPrice,
    marketValue,
    costBasis,
    profitLoss: parseNumber(pick(row, aliases('profitLoss', mapping))),
    currency: String(pick(row, aliases('currency', mapping)) || options.currency || 'EUR').toUpperCase().slice(0, 3),
    warnings: [],
    errors: []
  };
  position.id = positionHash(position);
  if (!position.symbol && !position.isin && !position.name) position.errors.push('Missing symbol/ISIN/name.');
  if (!Number.isFinite(position.shares)) position.errors.push('Missing position quantity.');
  if (!Number.isFinite(position.currentPrice) && !Number.isFinite(position.marketValue)) position.warnings.push('Missing current price or market value.');
  if (!Number.isFinite(position.buyPrice) && !Number.isFinite(position.costBasis)) position.warnings.push('Missing cost basis.');
  return position;
}

function normalizeGenericCsv(text, options = {}) {
  const rows = parseDelimitedText(text, options);
  const objects = rowsToObjects(rows);
  const labels = headerLabels(rows);
  const detection = options.detection || detectBroker({ text, fileName: options.fileName, contentType: 'text/csv' });
  const mapping = options.mapping || {};
  const resolvedMapping = resolveFieldMapping(labels, mapping);
  const importKind = classifyCsvImport(resolvedMapping, objects);
  const transactionRows = importKind === 'positions' ? [] : objects.filter(row => importKind !== 'mixed' || pick(row, aliases('type', mapping)));
  const positionRows = importKind === 'transactions' ? [] : objects.filter(row => importKind !== 'mixed' || !pick(row, aliases('type', mapping)));
  const transactions = transactionRows.map((row) => {
    const type = normalizeTransactionType(pick(row, aliases('type', mapping)));
    const tx = {
      id: '',
      sourceRow: row.sourceRow,
      broker: options.broker || detection.broker || 'generic',
      accountId: options.accountId || pick(row, aliases('accountId', mapping)),
      symbol: pick(row, aliases('symbol', mapping)),
      isin: pick(row, aliases('isin', mapping)),
      name: pick(row, aliases('name', mapping)),
      tradeDate: pick(row, aliases('tradeDate', mapping)),
      settlementDate: pick(row, aliases('settlementDate', mapping)),
      type,
      quantity: parseNumber(pick(row, aliases('quantity', mapping))),
      price: parseNumber(pick(row, aliases('price', mapping))),
      grossAmount: parseNumber(pick(row, aliases('grossAmount', mapping))),
      fees: parseNumber(pick(row, aliases('fees', mapping))),
      taxes: parseNumber(pick(row, aliases('taxes', mapping))),
      currency: String(pick(row, aliases('currency', mapping)) || options.currency || 'EUR').toUpperCase().slice(0, 3),
      notes: '',
      warnings: [],
      errors: []
    };
    tx.id = rowHash(tx);
    if (!tx.symbol && !tx.isin) tx.warnings.push('Missing symbol/ISIN.');
    if (!Number.isFinite(tx.quantity)) tx.errors.push('Missing quantity.');
    if (!Number.isFinite(tx.price) && !Number.isFinite(tx.grossAmount) && ['BUY', 'SELL'].includes(tx.type)) tx.warnings.push('Missing price or gross amount.');
    return tx;
  });
  const positions = positionRows.map(row => normalizePositionRow(row, mapping, detection, options));
  const requiredFieldsMissing = [];
  if (importKind !== 'positions' && !resolvedMapping.type) requiredFieldsMissing.push('type');
  if (!resolvedMapping.quantity) requiredFieldsMissing.push('quantity');
  if (importKind !== 'positions' && !resolvedMapping.price && !resolvedMapping.grossAmount) requiredFieldsMissing.push('price or amount');
  if (importKind !== 'transactions' && !resolvedMapping.currentPrice && !resolvedMapping.marketValue) requiredFieldsMissing.push('current price or market value');
  if (!resolvedMapping.symbol && !resolvedMapping.isin && !resolvedMapping.name) requiredFieldsMissing.push('symbol, ISIN or name');
  const hasTransactionErrors = transactions.some(tx => (tx.errors || []).length);
  const hasPositionErrors = positions.some(position => (position.errors || []).length);
  return {
    detectedBroker: options.broker || detection.broker || 'generic-csv',
    adapter: detection.adapter || 'generic-csv',
    confidence: options.broker ? 0.75 : detection.confidence,
    reason: detection.reason,
    importKind,
    headers: labels,
    fieldMapping: resolvedMapping,
    requiredFieldsMissing,
    mappingRequired: requiredFieldsMissing.length > 0 || hasTransactionErrors || hasPositionErrors || objects.length === 0,
    rowCount: objects.length,
    transactions,
    positions,
    symbols: [...new Set([...transactions.map(tx => tx.isin || tx.symbol), ...positions.map(position => position.isin || position.symbol)].filter(Boolean))],
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
  if (/consorsbank|bnp\s*paribas|cortal\s*consors/.test(sample)) {
    return { broker: 'consorsbank', adapter: isPdf ? 'consorsbank-pdf' : 'consorsbank-csv', confidence: 0.86, reason: 'Consorsbank/BNP Paribas marker found.' };
  }
  if (/comdirect|commerzbank/.test(sample)) {
    return { broker: 'comdirect', adapter: isPdf ? 'comdirect-pdf' : 'comdirect-csv', confidence: 0.84, reason: 'comdirect/Commerzbank marker found.' };
  }
  if (/\bdkb\b|deutsche\s+kreditbank/.test(sample)) {
    return { broker: 'dkb', adapter: isPdf ? 'dkb-pdf' : 'dkb-csv', confidence: 0.84, reason: 'DKB marker found.' };
  }
  if (/\bing\b|ing[-\s]?diba/.test(sample)) {
    return { broker: 'ing', adapter: isPdf ? 'ing-pdf' : 'ing-csv', confidence: 0.84, reason: 'ING marker found.' };
  }
  if (/flatex|finanzen\.net\s*zero|smartbroker|s-broker|sbroker|maxblue|deutsche\s+bank/.test(sample)) {
    const broker = /finanzen\.net\s*zero/.test(sample) ? 'finanzen-net-zero'
      : /smartbroker/.test(sample) ? 'smartbroker'
      : /s-broker|sbroker/.test(sample) ? 's-broker'
      : /maxblue|deutsche\s+bank/.test(sample) ? 'maxblue'
      : 'flatex';
    return { broker, adapter: isPdf ? `${broker}-pdf` : `${broker}-csv`, confidence: 0.78, reason: 'German broker marker found.' };
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

function parseBrokerPdfPositions(text, options = {}) {
  const detection = options.detection || detectBroker({ text, fileName: options.fileName, contentType: 'application/pdf' });
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  if (!/(depotbestand|bestand|depotübersicht|depotuebersicht|portfolio|positionen|marktwert|kurswert|einstand)/i.test(compact)) {
    return null;
  }
  const snapshotDate = normalizeDate(findFirst(compact, [
    /(?:Stand|Stichtag|Bewertungsdatum|Datum)\s*:?\s*(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}|\d{4}-\d{2}-\d{2})/i,
    /(\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4})/
  ]));
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const seen = new Set();
  const positions = [];
  lines.forEach((line, index) => {
    const isin = findFirst(line, [/\b([A-Z]{2}[A-Z0-9]{9}\d)\b/]);
    if (!isin || seen.has(`${isin}:${index}`)) return;
    const windowText = lines.slice(Math.max(0, index - 1), index + 3).join(' ');
    const cleanWindow = windowText
      .replace(isin, ' ')
      .replace(/\d{1,2}[.\/]\d{1,2}[.\/]\d{2,4}/g, ' ')
      .replace(/\d{4}-\d{2}-\d{2}/g, ' ')
      .replace(/\b[A-Z0-9]{6}\b/g, ' ');
    const sharesText = findFirst(cleanWindow, [
      /(?:Stück|Stueck|Anzahl|Quantity|Qty|Bestand)\s*:?\s*([-\d.,]+)/i,
      /([-\d.,]+)\s*(?:Stück|Stueck|shares?)/i
    ]);
    const rawNumbers = (cleanWindow.match(/[-+]?\d{1,3}(?:[.\s]\d{3})*(?:,\d+)?|[-+]?\d+(?:\.\d+)?/g) || [])
      .map(parseNumber)
      .filter(Number.isFinite)
      .filter(n => Math.abs(n) > 0.0000001);
    const shares = Number.isFinite(parseNumber(sharesText)) ? parseNumber(sharesText) : rawNumbers[0];
    const numericTail = rawNumbers.filter((n, i) => i !== 0 || n !== shares);
    const marketValue = numericTail.length ? numericTail[numericTail.length - 1] : NaN;
    const currentPrice = numericTail.length > 1 ? numericTail[numericTail.length - 2] : (Number.isFinite(marketValue) && shares > 0 ? Math.abs(marketValue) / shares : NaN);
    const buyPrice = numericTail.length > 2 ? numericTail[0] : NaN;
    const name = windowText.split(isin)[0].replace(/\b(WKN|ISIN|Depotbestand|Bestand|Positionen?)\b/ig, ' ').replace(/\s+/g, ' ').trim().slice(-80);
    const currency = findFirst(windowText, [/\b(EUR|USD|CHF|GBP)\b/]) || options.currency || 'EUR';
    const position = {
      id: '',
      sourceRow: index + 1,
      sourceSpan: `pdf:${index + 1}`,
      broker: options.broker || detection.broker || 'unknown-pdf',
      accountId: options.accountId || '',
      symbol: '',
      isin,
      name,
      snapshotDate,
      shares,
      buyPrice,
      currentPrice,
      marketValue,
      costBasis: Number.isFinite(buyPrice) && Number.isFinite(shares) ? Math.abs(buyPrice * shares) : NaN,
      profitLoss: NaN,
      currency: String(currency).toUpperCase().slice(0, 3),
      warnings: [],
      errors: []
    };
    position.id = positionHash(position);
    if (!Number.isFinite(position.shares)) position.errors.push('Missing position quantity.');
    if (!Number.isFinite(position.currentPrice) && !Number.isFinite(position.marketValue)) position.warnings.push('Missing current price or market value.');
    if (!position.errors.length) {
      seen.add(`${isin}:${index}`);
      positions.push(position);
    }
  });
  if (!positions.length) return null;
  return {
    importId: options.importId,
    detectedBroker: options.broker || detection.broker || 'unknown-pdf',
    adapter: detection.adapter || 'generic-pdf',
    confidence: Math.max(detection.confidence || 0, 0.55),
    reason: `${detection.reason || 'PDF text parsed.'} Position snapshot rows found.`,
    importKind: 'positions',
    mappingRequired: false,
    rowCount: positions.length,
    transactions: [],
    positions,
    symbols: [...new Set(positions.map(position => position.isin || position.symbol).filter(Boolean))],
    dateRange: { from: null, to: null },
    warnings: positions.flatMap(position => position.warnings || []),
    errors: []
  };
}

function parseBrokerPdfText(text, options = {}) {
  const detection = options.detection || detectBroker({ text, fileName: options.fileName, contentType: 'application/pdf' });
  if (detection.adapter === 'unknown-pdf') {
    const positionPreview = parseBrokerPdfPositions(text, { ...options, detection });
    if (positionPreview) return positionPreview;
    return {
      detectedBroker: detection.broker,
      adapter: detection.adapter,
      confidence: detection.confidence,
      reason: detection.reason,
      importKind: 'transactions',
      rowCount: 0,
      transactions: [],
      positions: [],
      symbols: [],
      dateRange: { from: null, to: null },
      warnings: [],
      errors: ['Unsupported broker PDF.']
    };
  }
  const compact = String(text || '').replace(/\s+/g, ' ').trim();
  const isin = findFirst(compact, [/\b([A-Z]{2}[A-Z0-9]{9}\d)\b/]);
  const type = pdfTransactionType(compact);
  if (type === 'UNKNOWN') {
    const positionPreview = parseBrokerPdfPositions(text, { ...options, detection });
    if (positionPreview) return positionPreview;
  }
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
    importKind: 'transactions',
    mappingRequired: false,
    rowCount: 1,
    transactions: [tx],
    positions: [],
    symbols: [isin].filter(Boolean),
    dateRange: { from: date || null, to: date || null },
    warnings: tx.warnings.slice(),
    errors: []
  };
}

function attachDocumentExtraction(preview, document, reason = '') {
  const diagnostics = Array.isArray(document?.diagnostics) ? document.diagnostics : [];
  const warnings = [
    ...(preview.warnings || []),
    ...(document?.warnings || []),
    document?.provider ? `OCR provider: ${document.provider}.` : '',
    Number.isFinite(document?.confidence) ? `OCR confidence: ${Math.round(document.confidence * 100)}%.` : '',
    reason
  ].filter(Boolean);
  return {
    ...preview,
    extractedBy: document?.provider || preview.extractedBy || 'text',
    ocrConfidence: Number.isFinite(document?.confidence) ? document.confidence : undefined,
    ocrDiagnostics: diagnostics,
    pages: Array.isArray(document?.pages) ? document.pages.length : undefined,
    warnings
  };
}

function parseBrokerDocument(document, options = {}) {
  const text = String(document?.text || document?.rawText || '');
  const contentType = options.contentType || 'application/pdf';
  const fileName = options.fileName || '';
  const detection = options.detection || detectBroker({ text, fileName, contentType });
  const preview = parseBrokerPdfText(text, { ...options, detection });
  return attachDocumentExtraction(preview, document);
}

async function parsePdfWithOcr(buffer, options = {}, reason = '') {
  const extractor = options.ocrExtractor || require('./ocr-providers').extractDocument;
  let document;
  try {
    document = await extractor(buffer, {
      ...options,
      contentType: options.contentType || 'application/pdf',
      maxPages: options.ocrMaxPages || options.maxPages || 8,
      scale: options.ocrScale || options.scale || 2.5
    });
  } catch (error) {
    return {
      detectedBroker: 'pdf',
      adapter: 'local-ocr',
      confidence: 0,
      importKind: 'transactions',
      rowCount: 0,
      transactions: [],
      positions: [],
      symbols: [],
      dateRange: { from: null, to: null },
      warnings: [],
      errors: [`ocr_failed: ${error.message || error}`]
    };
  }
  if (!document?.ok && !document?.text) {
    return {
      detectedBroker: 'pdf',
      adapter: document?.provider || 'local-ocr',
      confidence: 0,
      importKind: 'transactions',
      rowCount: 0,
      transactions: [],
      positions: [],
      symbols: [],
      dateRange: { from: null, to: null },
      warnings: document?.warnings || [],
      errors: [`ocr_unavailable: ${(document?.diagnostics || ['No local OCR result was produced.']).join('; ')}`],
      ocrDiagnostics: document?.diagnostics || []
    };
  }
  const preview = parseBrokerDocument(document, options);
  return attachDocumentExtraction(preview, document, reason);
}

async function parseImportBuffer(buffer, options = {}) {
  const contentType = String(options.contentType || '').toLowerCase();
  const fileName = String(options.fileName || '').toLowerCase();
  if (contentType.includes('pdf') || fileName.endsWith('.pdf')) {
    let pdfParse;
    try {
      pdfParse = require('pdf-parse');
    } catch {
      return parsePdfWithOcr(buffer, options, 'Text PDF parsing dependency missing; local OCR was used.');
    }
    let parsed;
    try {
      parsed = await pdfParse(buffer);
    } catch (error) {
      return parsePdfWithOcr(buffer, options, `Text PDF parsing failed; local OCR was used. ${error.message || ''}`.trim());
    }
    const text = parsed.text || '';
    if (!text.trim()) return parsePdfWithOcr(buffer, options, 'Scanned/image-only PDF detected; local OCR was used.');
    const preview = parseBrokerPdfText(text, { ...options, detection: detectBroker({ text, fileName, contentType }) });
    const unsupported = (preview.errors || []).some(error => /unsupported broker pdf/i.test(error));
    if (unsupported && options.ocrFallback !== false) {
      const ocrPreview = await parsePdfWithOcr(buffer, options, 'Text layer did not match a supported broker format; local OCR fallback was attempted.');
      if ((ocrPreview.transactions || []).length || (ocrPreview.positions || []).length) return ocrPreview;
    }
    return preview;
  }
  const text = buffer.toString('utf8');
  return normalizeGenericCsv(text, { ...options, detection: detectBroker({ text, fileName, contentType }) });
}

module.exports = { parseDelimitedText, normalizeGenericCsv, parseImportBuffer, parseBrokerPdfText, parseBrokerDocument, detectBroker, parseNumber, rowHash };
