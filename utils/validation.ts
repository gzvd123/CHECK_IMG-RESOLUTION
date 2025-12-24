import { read, utils } from 'xlsx';
import { SpecRow, ValidationResult, ValidationConfig } from '../types';

const TOLERANCE = 0.5;

// --- 1. Normalization Logic (Slugify) ---
// Rules: Lowercase, keep alphanumeric, replace all separators with single hyphen, trim ends.
const toSlug = (text: string): string => {
  if (!text) return '';
  return text.toLowerCase()
    // Replace non-alphanumeric characters with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // Collapse multiple hyphens into one and trim start/end
    .replace(/^-+|-+$/g, '');
};

// Helper: Convert Excel column letter to index (A -> 0, B -> 1, AA -> 26)
const colLetterToIndex = (letter: string): number => {
  let column = letter.toUpperCase();
  let result = 0;
  for (let i = 0; i < column.length; i++) {
    result *= 26;
    result += column.charCodeAt(i) - 64;
  }
  return result - 1;
};

// Helper: Extract all numbers from a string
const extractNumbers = (value: any): number[] => {
  if (typeof value === 'number') return [value];
  if (!value) return [];
  const str = String(value);
  const matches = str.match(/-?\d*\.?\d+/g);
  if (!matches) return [];
  return matches.map(Number).filter(n => !isNaN(n));
};

// --- 2. Spec Parsing (Pre-calculation) ---
export const parseSpecFile = async (file: File, config?: ValidationConfig): Promise<SpecRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonData: any[] = utils.sheet_to_json(worksheet);

        if (jsonData.length === 0) {
            resolve([]);
            return;
        }

        // Identify Product Name Column
        const firstRow = jsonData[0];
        const keys = Object.keys(firstRow);
        
        const productNamePatterns = [
            /^product\s*name$/i, /^product$/i, /^model\s*name$/i, /^model$/i, /^item\s*name$/i, /^name$/i, /name/i
        ];

        let productNameKey = '';
        for (const pattern of productNamePatterns) {
            const match = keys.find(k => pattern.test(k.trim()));
            if (match) {
                productNameKey = match;
                break;
            }
        }
        if (!productNameKey) productNameKey = 'Product Name';

        // Column Range Logic
        const headers = (utils.sheet_to_json(worksheet, { header: 1 })[0] || []) as string[];
        let allowedIndices: number[] = [];
        if (config && config.startCol && config.endCol) {
           const start = colLetterToIndex(config.startCol);
           const end = colLetterToIndex(config.endCol);
           for (let i = start; i <= end; i++) allowedIndices.push(i);
        } else {
           allowedIndices = headers.map((_, i) => i);
        }
        const allowedKeys = allowedIndices.map(i => headers[i]).filter(k => k !== undefined);

        // Map Rows
        const specs: SpecRow[] = jsonData.map(row => {
          const productName = String(row[productNameKey] || '').trim();
          
          const sizeKey = keys.find(k => /^size$/i.test(k.trim()) || /^dimension$/i.test(k.trim())) || 'Size';
          const size = row[sizeKey] || '';
          
          let expectedDimensions: number[] = [];
          
          Object.entries(row).forEach(([key, value]) => {
             if (config && config.startCol) {
                 if (!allowedKeys.includes(key)) return;
             } else {
                 const keyLower = key.toLowerCase();
                 if (['product', 'name', 'size', 'id', 'model', 'row', 'sku'].some(k => keyLower.includes(k))) return;
             }

             const nums = extractNumbers(value);
             nums.forEach(num => {
                 if (num > 0 && num < 2000) expectedDimensions.push(num);
             });
          });

          return {
            productName: productName,
            productSlug: toSlug(productName), // Pre-calculate slug here
            size: String(size).trim(),
            expectedDimensions: expectedDimensions.sort((a, b) => a - b),
            originalRow: row
          };
        });

        // Filter out empty rows
        resolve(specs.filter(s => s.productName && s.productSlug.length > 0));
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const findMatchingSpec = (fileName: string, specs: SpecRow[]): SpecRow | undefined => {
  const matches = findAllMatchingSpecs(fileName, specs);
  return matches.length > 0 ? matches[0] : undefined;
};

// --- 3. Strict Match Logic ---
// Rule: normalized_filename MUST contain normalized_product_name
export const findAllMatchingSpecs = (fileName: string, specs: SpecRow[]): SpecRow[] => {
  // 1. Normalize File Name
  // Remove extension first
  const fileStem = fileName.replace(/\.[^/.]+$/, "");
  const fileSlug = toSlug(fileStem);
  
  if (!fileSlug) return [];

  const candidates: SpecRow[] = [];

  for (const spec of specs) {
    // Optimization: Skip empty slugs (though filtered in parse)
    if (!spec.productSlug) continue;

    // CORE CHECK: Is Product Slug a substring of File Slug?
    if (fileSlug.includes(spec.productSlug)) {
      candidates.push(spec);
    }
  }

  // If no matches, return empty
  if (candidates.length === 0) return [];

  // Tie-Breaker Logic:
  // If multiple products match (e.g. "Side Table" and "Mardi Marble Side Table"),
  // we want the one that is MORE SPECIFIC.
  // In slug world, the LONGER slug is usually the more specific one.
  // "side-table" (length 10) vs "mardi-marble-side-table" (length 23)
  // We want "mardi-marble-side-table".
  
  candidates.sort((a, b) => {
    // 1. Priority: Length of the Product Slug (Longest wins)
    if (b.productSlug.length !== a.productSlug.length) {
        return b.productSlug.length - a.productSlug.length;
    }
    // 2. Priority: Alphabetical (Stable sort)
    return a.productName.localeCompare(b.productName);
  });

  return candidates;
};

export const validateDimensions = (detected: number[], spec: SpecRow): ValidationResult => {
  const sortedDetected = [...detected].sort((a, b) => a - b);
  const sortedExpected = [...spec.expectedDimensions].sort((a, b) => a - b);

  const matches: { expected: number; detected: number; diff: number }[] = [];
  const missing: number[] = [];
  const extra: number[] = [...sortedDetected];

  for (const exp of sortedExpected) {
    let bestMatchIdx = -1;
    let minDiff = Number.MAX_VALUE;

    for (let i = 0; i < extra.length; i++) {
      const diff = Math.abs(exp - extra[i]);
      if (diff <= TOLERANCE && diff < minDiff) {
        minDiff = diff;
        bestMatchIdx = i;
      }
    }

    if (bestMatchIdx !== -1) {
      matches.push({
        expected: exp,
        detected: extra[bestMatchIdx],
        diff: minDiff
      });
      extra.splice(bestMatchIdx, 1);
    } else {
      missing.push(exp);
    }
  }

  let status: ValidationResult['status'] = 'MISMATCH';

  if (missing.length === 0 && extra.length === 0) {
    status = 'PERFECT';
  } else if (missing.length > 0 && extra.length === 0) {
    status = 'MISSING';
  } else if (missing.length === 0 && extra.length > 0) {
    status = 'EXTRA';
  } else {
    status = 'MISMATCH';
  }

  return { status, matchedRow: spec, matches, missing, extra };
};