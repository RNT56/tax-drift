const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

function finiteNumber(value, fallback = NaN) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function commandAvailable(command) {
  try {
    await execFileAsync(command, ['--version'], { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function getTesseractLanguages(command = 'tesseract') {
  try {
    const { stdout, stderr } = await execFileAsync(command, ['--list-langs'], { timeout: 5000 });
    return String(`${stdout}\n${stderr}`)
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line && !/^list of available languages/i.test(line));
  } catch {
    return [];
  }
}

function resolveLanguages(requested = 'deu+eng', available = []) {
  const wanted = String(requested || 'eng').split('+').map(item => item.trim()).filter(Boolean);
  const availableSet = new Set(available);
  const selected = wanted.filter(lang => availableSet.has(lang));
  if (!selected.length && availableSet.has('eng')) selected.push('eng');
  if (!selected.length && available.length) selected.push(available[0]);
  return selected.join('+') || 'eng';
}

function parseTesseractTsv(tsv, pageNumber = 1) {
  const rows = String(tsv || '').split(/\r?\n/).filter(Boolean);
  const headers = rows.shift()?.split('\t') || [];
  const indexOf = (name) => headers.indexOf(name);
  const words = [];
  rows.forEach((line) => {
    const cols = line.split('\t');
    const text = cols[indexOf('text')] || '';
    const confidence = finiteNumber(cols[indexOf('conf')], -1);
    if (!text.trim() || confidence < 0) return;
    const word = {
      text: text.trim(),
      confidence,
      box: {
        x: finiteNumber(cols[indexOf('left')], 0),
        y: finiteNumber(cols[indexOf('top')], 0),
        width: finiteNumber(cols[indexOf('width')], 0),
        height: finiteNumber(cols[indexOf('height')], 0)
      },
      pageNumber,
      blockNumber: cols[indexOf('block_num')] || '',
      paragraphNumber: cols[indexOf('par_num')] || '',
      lineNumber: cols[indexOf('line_num')] || ''
    };
    words.push(word);
  });
  return words;
}

function linesFromWords(words = []) {
  const groups = new Map();
  words.forEach((word) => {
    const key = [word.pageNumber, word.blockNumber, word.paragraphNumber, word.lineNumber].join('|');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(word);
  });
  return [...groups.values()].map((items) => {
    const sorted = items.slice().sort((a, b) => a.box.x - b.box.x);
    const left = Math.min(...sorted.map(item => item.box.x));
    const top = Math.min(...sorted.map(item => item.box.y));
    const right = Math.max(...sorted.map(item => item.box.x + item.box.width));
    const bottom = Math.max(...sorted.map(item => item.box.y + item.box.height));
    const confidence = sorted.reduce((sum, item) => sum + item.confidence, 0) / sorted.length;
    return {
      text: sorted.map(item => item.text).join(' ').replace(/\s+/g, ' ').trim(),
      confidence,
      box: { x: left, y: top, width: right - left, height: bottom - top },
      pageNumber: sorted[0]?.pageNumber || 1,
      words: sorted
    };
  }).filter(line => line.text).sort((a, b) => (a.pageNumber - b.pageNumber) || (a.box.y - b.box.y) || (a.box.x - b.box.x));
}

function tablesFromLines(lines = []) {
  const tableRows = lines
    .filter(line => {
      const numericTokens = (line.text.match(/[-+]?\d[\d.,]*/g) || []).length;
      return numericTokens >= 2 && /\b[A-Z]{2}[A-Z0-9]{9}\d\b/.test(line.text);
    })
    .map((line) => ({
      confidence: line.confidence,
      cells: line.text.split(/\s{2,}|\t/).filter(Boolean).map((text, index) => ({
        rowIndex: 0,
        columnIndex: index,
        text,
        confidence: line.confidence,
        box: line.box
      })),
      sourceLine: line.text,
      pageNumber: line.pageNumber
    }));
  return tableRows.length ? [{ confidence: tableRows.reduce((sum, row) => sum + row.confidence, 0) / tableRows.length, rows: tableRows }] : [];
}

async function renderPdfPages(buffer, options = {}) {
  const maxPages = Math.max(1, finiteNumber(options.maxPages, 8));
  const scale = Math.max(1, finiteNumber(options.scale, 2.5));
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const { createCanvas } = require('@napi-rs/canvas');
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useSystemFonts: true
  }).promise;
  const pageCount = Math.min(document.numPages || 0, maxPages);
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    const canvasContext = canvas.getContext('2d');
    await page.render({ canvasContext, viewport }).promise;
    pages.push({
      pageNumber,
      width: viewport.width,
      height: viewport.height,
      image: canvas.toBuffer('image/png')
    });
  }
  return pages;
}

async function runTesseract(imageBuffer, options = {}) {
  const command = options.command || process.env.TESSERACT_BIN || 'tesseract';
  const availableLanguages = options.availableLanguages || await getTesseractLanguages(command);
  const languages = resolveLanguages(options.languages || process.env.OCR_LANGUAGES || 'deu+eng', availableLanguages);
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tax-drift-ocr-'));
  const imagePath = path.join(tempDir, 'page.png');
  try {
    await fs.writeFile(imagePath, imageBuffer);
    const args = [
      imagePath,
      'stdout',
      '-l',
      languages,
      '--psm',
      String(options.psm || process.env.OCR_PSM || 6),
      'tsv'
    ];
    const { stdout, stderr } = await execFileAsync(command, args, {
      timeout: Math.max(5000, finiteNumber(options.timeoutMs, 45000)),
      maxBuffer: 1024 * 1024 * 16
    });
    return { stdout, stderr, languages, command };
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

function buildDocumentModel(pageResults = [], metadata = {}) {
  const pages = pageResults.map((page) => {
    const words = page.words || [];
    const lines = linesFromWords(words);
    return {
      pageNumber: page.pageNumber,
      width: page.width || 0,
      height: page.height || 0,
      words,
      lines,
      tables: tablesFromLines(lines),
      rawText: lines.map(line => line.text).join('\n')
    };
  });
  const allWords = pages.flatMap(page => page.words);
  const confidence = allWords.length
    ? allWords.reduce((sum, word) => sum + word.confidence, 0) / allWords.length / 100
    : 0;
  return {
    provider: metadata.provider || 'local-tesseract',
    confidence,
    text: pages.map(page => page.rawText).filter(Boolean).join('\n'),
    pages,
    tables: pages.flatMap(page => page.tables || []),
    diagnostics: metadata.diagnostics || [],
    warnings: metadata.warnings || []
  };
}

async function extractImageDocument(buffer, options = {}) {
  const available = await commandAvailable(options.command || process.env.TESSERACT_BIN || 'tesseract');
  if (!available) {
    return {
      ok: false,
      provider: 'local-tesseract',
      confidence: 0,
      text: '',
      pages: [],
      tables: [],
      warnings: [],
      diagnostics: ['local_tesseract_unavailable']
    };
  }
  const result = await runTesseract(buffer, options);
  const words = parseTesseractTsv(result.stdout, 1);
  return {
    ok: true,
    ...buildDocumentModel([{ pageNumber: 1, words }], {
      provider: 'local-tesseract',
      diagnostics: [`languages:${result.languages}`].concat(result.stderr ? [`stderr:${String(result.stderr).slice(0, 500)}`] : [])
    })
  };
}

async function extractPdfDocument(buffer, options = {}) {
  const available = await commandAvailable(options.command || process.env.TESSERACT_BIN || 'tesseract');
  if (!available) {
    return {
      ok: false,
      provider: 'local-tesseract',
      confidence: 0,
      text: '',
      pages: [],
      tables: [],
      warnings: [],
      diagnostics: ['local_tesseract_unavailable']
    };
  }
  let renderedPages = [];
  try {
    renderedPages = await renderPdfPages(buffer, options);
  } catch (error) {
    return {
      ok: false,
      provider: 'local-tesseract',
      confidence: 0,
      text: '',
      pages: [],
      tables: [],
      warnings: [],
      diagnostics: [`pdf_render_failed:${error.message || error}`]
    };
  }
  const pageResults = [];
  const diagnostics = [];
  for (const page of renderedPages) {
    try {
      const result = await runTesseract(page.image, options);
      diagnostics.push(`page:${page.pageNumber}:languages:${result.languages}`);
      pageResults.push({
        pageNumber: page.pageNumber,
        width: page.width,
        height: page.height,
        words: parseTesseractTsv(result.stdout, page.pageNumber)
      });
    } catch (error) {
      diagnostics.push(`page:${page.pageNumber}:ocr_failed:${error.message || error}`);
    }
  }
  if (!pageResults.length) {
    return {
      ok: false,
      provider: 'local-tesseract',
      confidence: 0,
      text: '',
      pages: [],
      tables: [],
      warnings: [],
      diagnostics
    };
  }
  return {
    ok: true,
    ...buildDocumentModel(pageResults, { provider: 'local-tesseract', diagnostics })
  };
}

async function extractDocument(buffer, options = {}) {
  const contentType = String(options.contentType || '').toLowerCase();
  const fileName = String(options.fileName || '').toLowerCase();
  const isPdf = contentType.includes('pdf') || fileName.endsWith('.pdf');
  const isImage = /^image\//.test(contentType) || /\.(png|jpe?g|tiff?|bmp|webp)$/i.test(fileName);
  if (isPdf) return extractPdfDocument(buffer, options);
  if (isImage) return extractImageDocument(buffer, options);
  return {
    ok: false,
    provider: 'local-tesseract',
    confidence: 0,
    text: '',
    pages: [],
    tables: [],
    warnings: [],
    diagnostics: ['unsupported_ocr_content_type']
  };
}

module.exports = {
  commandAvailable,
  getTesseractLanguages,
  resolveLanguages,
  parseTesseractTsv,
  linesFromWords,
  tablesFromLines,
  renderPdfPages,
  runTesseract,
  buildDocumentModel,
  extractDocument
};
