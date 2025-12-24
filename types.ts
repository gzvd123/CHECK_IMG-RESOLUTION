
export interface AnalysisState {
  isLoading: boolean;
  result: GeminiResponse | null;
  error: string | null;
  validation?: ValidationResult;
}

export interface AnalysisInput {
  type: 'image' | 'text';
  content: string; // Base64
  mimeType: string;
  fileName?: string;
}

export interface GeminiResponse {
  dimensions: number[];
  units: string;
  markdown_table: string;
  raw_text: string;
}

export interface SpecRow {
  productName: string;
  productSlug: string; // Pre-calculated normalized slug for matching
  size: string;
  expectedDimensions: number[];
  originalRow: any;
}

export type ValidationStatus = 'PERFECT' | 'MISSING' | 'EXTRA' | 'MISMATCH' | 'NO_MATCH';

export interface ValidationResult {
  status: ValidationStatus;
  matchedRow?: SpecRow;
  matches: { expected: number; detected: number; diff: number }[];
  missing: number[];
  extra: number[];
}

export interface ValidationConfig {
  startCol: string; // e.g. "G"
  endCol: string;   // e.g. "M"
}

// --- Batch Types ---

export interface BatchItem {
  id: string;
  file: File;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'SKIPPED';
  matchedSpecs: SpecRow[]; // Can match multiple rows
  aiResponse?: GeminiResponse;
  validations?: ValidationResult[]; // Result for each matched spec
  error?: string;
}

export interface BatchState {
  items: BatchItem[];
  isProcessing: boolean;
  progress: number;
  total: number;
}