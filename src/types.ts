/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ScannedPlate {
  id: string;
  name: string; // User-defined custom name/nickname for the equipment
  timestamp: string;
  imageUrl?: string;
  rawText: string;
  extracted: ExtractionResults;
}

export interface ExtractionResults {
  mlfb: string; // Machine-readable product code
  mlfbFormatted: string; // Beautified MLFB
  mlfbMatchConfidence: number; // Percent confidence of heuristics (low, medium, high)
  mlfbParts?: {
    family: string; // e.g. "6ES7" (PLC S7)
    type: string; // e.g. "315"
    suffix: string; // e.g. "2AH14-0AB0"
  };
  zCodes: string[]; // Options arrays e.g. ["A11", "K20"]
  zExplanation?: { [key: string]: string }; // Dictionary map for matched codes
  serial: string; // Serial number or Factory Number
  fdDate: string; // Manufacturing Date code (e.g., FD 1204)
  voltage: string; // e.g. "230/400 V"
  current: string; // e.g. "11.4/6.6 A"
  power: string; // e.g. "5.5 kW" or "7.5 HP"
  speed: string; // e.g. "1450 RPM"
  frequency: string; // e.g. "50 Hz"
  cosPhi: string; // Cosine Phi (power factor)
  ipRating: string; // e.g. "IP55"
  weight: string; // e.g. "45 kg"
  efficiency: string; // e.g. "IE3 - 88.5%"
  modelType: 'motor' | 'vfd' | 'plc' | 'switchgear' | 'other';
  mlfbAdjustments?: string[]; // Automated corrections applied to improve OCR accuracy
  ocrEngine?: 'gemini' | 'tesseract';
}

export interface TesseractProgress {
  status: string;
  progress: number;
}

export interface BatchItem {
  id: string;
  name: string;
  size: number;
  file: File;
  status: 'queued' | 'processing' | 'success' | 'failed';
  error?: string;
  progress: number;
  dataUrl?: string;
  extracted?: ExtractionResults;
  rawText?: string;
}
