/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExtractionResults } from '../types';

// Predefined Siemens families based on MLFB prefix
export const SIEMENS_FAMILIES: { [key: string]: { name: string; category: 'motor' | 'vfd' | 'plc' | 'switchgear' | 'other'; desc: string } } = {
  '1LA': { name: 'Motor Standard SIMOTICS', category: 'motor', desc: 'Motor asincrónico trifásico clásico de baja tensión con carcasa de aluminio.' },
  '1LE': { name: 'Motor de Alta Eficiencia SIMOTICS GP/SD', category: 'motor', desc: 'Motor de baja tensión de última generación con clases de eficiencia IE1, IE2, IE3 o IE4.' },
  '1LG': { name: 'Motor de Alta Potencia SIMOTICS SD', category: 'motor', desc: 'Motor asincrónico industrial con robusta carcasa de hierro fundido.' },
  '1LH': { name: 'Motor SIMOTICS', category: 'motor', desc: 'Motor industrial síncrono o asíncrono para aplicaciones pesadas.' },
  '1LP': { name: 'Motor SIMOTICS (Sin Ventilación)', category: 'motor', desc: 'Motor asíncrono autoventilado o para flujo de aire externo libre.' },
  '1PH': { name: 'Motor Principal SIMOTICS M', category: 'motor', desc: 'Motor asíncrono compacto para husillos principales de máquinas herramienta y accionamientos servo-controlados.' },
  '1FK': { name: 'Servomotor Síncrono SIMOTICS S-1FK', category: 'motor', desc: 'Servomotor dinámico de alta precisión con imanes permanentes.' },
  '1FT': { name: 'Servomotor Síncrono SIMOTICS S-1FT', category: 'motor', desc: 'Servomotor de alta gama para aplicaciones de extrema precisión y dinámica en CNC.' },
  '1FS': { name: 'Servomotor Especial SIMOTICS S-1FS', category: 'motor', desc: 'Servomotor higiénico o para condiciones climáticas severas.' },
  '1MB': { name: 'Motor SIMOTICS Ex (Antideflagrante)', category: 'motor', desc: 'Motor de baja tensión certificado para uso en atmósferas explosivas (gases o polvos).' },
  '1PP': { name: 'Motor SIMOTICS Autoventilado', category: 'motor', desc: 'Motor de baja tensión sin ventilador propio, refrigerado por flujo externo.' },
  '2KJ': { name: 'Motorreductor SIMOGEAR', category: 'motor', desc: 'Conjunto integrado de reductor (helicoidal, plano, cónico o sinfín) y motor Siemens.' },
  '3RT': { name: 'Contactor de Potencia SIRIUS', category: 'switchgear', desc: 'Contactor industrial electromagnético para conmutación de motores y cargas inductivas.' },
  '3RV': { name: 'Interruptor Caja Moldeada / Guardamotor SIRIUS', category: 'switchgear', desc: 'Interruptor automático modular magnetotérmico para protección de motor y cortocircuitos.' },
  '3RU': { name: 'Relé de Sobrecarga Térmico SIRIUS', category: 'switchgear', desc: 'Relé bimetálico de protección contra sobrecargas para motores.' },
  '3UA': { name: 'Relé de Sobrecarga Bimetálico', category: 'switchgear', desc: 'Relé térmico bimetálico para protección clásica de motores.' },
  '3LD': { name: 'Interruptor Seccionador de Emergencia', category: 'switchgear', desc: 'Interruptor rotativo de parada de emergencia y desconexión segura en red eléctrica.' },
  '3NE': { name: 'Fusible Ultra Rápido SITOR', category: 'switchgear', desc: 'Fusible de acción ultrarrápida para protección de semiconductores y variadores.' },
  '5SY': { name: 'Interruptor Magnetotérmico Modular', category: 'switchgear', desc: 'Termomagnética clásica para riel DIN para redes residenciales o comerciales.' },
  '6ES': { name: 'Módulo SIMATIC S7 PLC / I/O', category: 'plc', desc: 'Controlador lógico programable (PLC) o tarjetas I/O distribuidas (S7-300 / 400 / 1200 / 1500, ET200).' },
  '6AV': { name: 'Panel Operador SIMATIC HMI', category: 'plc', desc: 'Pantalla industrial (KTP, Comfort, Unified) para interfaz Hombre-Máquina.' },
  '6EP': { name: 'Fuente de Alimentación SITOP', category: 'plc', desc: 'Fuente de poder estabilizada monofásica o trifásica industrial de alta confiabilidad (24V DC).' },
  '6SL': { name: 'Variador de Frecuencia SINAMICS', category: 'vfd', desc: 'Convertidor de frecuencia de CA para control de velocidad de motores (G120, V20, S120, S210).' },
  '6GK': { name: 'Módulo de Comunicación SIMATIC NET', category: 'plc', desc: 'Procesadores de comunicación industrial para redes PROFINET, PROFIBUS o Ethernet.' },
  '6FC': { name: 'Control Numérico Computarizado SINUMERIK', category: 'plc', desc: 'Control de movimiento de alto desempeño para fresadoras, tornos y centros de mecanizado (808D, 828D, 840D).' },
  '6FX': { name: 'Cable de Fuerza/Señal MOTION-CONNECT', category: 'other', desc: 'Cabling de alimentación y retroalimentación para servosistemas y CNC.' },
  '6SE': { name: 'Convertidor Histórico MICROMASTER', category: 'vfd', desc: 'Variadores históricos o filtros de reactancia de la línea Micromaster 420 / 440 o Masterdrives.' },
  '6SN': { name: 'Módulo de Accionamiento SIMODRIVE', category: 'vfd', desc: 'Gama clásica de servoaccionamientos modulares.' },
  '3SE': { name: 'Interruptor de Límite de Carrera SIRIUS', category: 'switchgear', desc: 'Finales de carrera electromecánicos o interruptores de seguridad con enclavamiento.' },
  '6UG': { name: 'Relé de Vigilancia Analógico/Digital SIRIUS', category: 'switchgear', desc: 'Monitores de tensión trifásica, corriente, simetría y secuencia de fases.' },
  '3UN': { name: 'Relé de Termistores de Motor SIRIUS', category: 'switchgear', desc: 'Unidad de disparo de termistores PTC para protección térmica.' },
  '3SF': { name: 'Dispositivo SIRIUS con Interfaz AS-i', category: 'switchgear', desc: 'Solución de interruptores e interruptores de parada conectados por AS-Interface.' }
};

// Common Siemens Z-Code definitions mapping
export const SIEMENS_Z_CODES: { [key: string]: string } = {
  // Motor PTC & Thermistors
  'A11': '3 termistores PTC para desconexión (protección térmica del motor)',
  'A10': '3 termistores PTC para alarma temprana',
  'A12': '6 termistores PTC para alarma y desconexión',
  'A15': 'Sensor de temperatura KTY84-130 (sensor de silicio en bobinado)',
  'A16': 'Sensor de temperatura PT1000 en el bobinado',
  'A22': '3 sensores PT100 (resistencia de platino) en bobinado trifásico',
  'A23': '6 sensores PT100 (resistencia de platino) en bobinado (2 por fase)',
  'A31': 'Termocontactos bimetálicos integrados (NC) para desconexión',

  // Acceptance Tests & Documentation
  'B02': 'Certificado de aceptación de fábrica 3.1 según EN 10204',
  'B07': 'Protocolo de ensayo tipo con informe de rendimiento eléctrico del motor',
  'B09': 'Inspección oficial por parte de un inspector / cliente antes del despacho',

  // Windings & Voltage configuration
  'C00': 'Bobinado con tensión o frecuencia especial (fuera de catálogo estándar)',
  'C11': 'Bobinado para redes con frecuencias fluctuantes o específicas de tracción/isla',
  'C18': 'Aislamiento reforzado para funcionamiento con variadores de 690 V (sin filtro)',

  // Insulation class
  'D11': 'Clase térmica F (155 °C) con utilización de potencia según clase B (120 °C) (margen de seguridad adicional)',
  'D12': 'Clase térmica H (180 °C)',
  'D15': 'Clase de aislamiento para climas extremadamente húmedos o costeros',
  'D22': 'Ejecución frigorífica para temperaturas ambiente hasta -40 °C',
  'D31': 'Ejecución para alta temperatura ambiente (+50 °C a +60 °C)',

  // Frame & Flange Options
  'E10': 'Brida con dimensiones especiales (ej. brida IM B5 sobredimensionada)',
  'E80': 'Extremo de eje con dimensiones especiales (diámetro/longitud personalizados)',

  // Brakes & Encoders
  'F01': 'Freno de resorte electromagnético de seguridad integrado (SIRIUS spring brake)',
  'F11': 'Palanca manual de desesclavamiento del freno integrado',
  'F02': 'Freno especial con bobina de tensión no estándar',
  'G01': 'Encoder síncrono incremental HTL (e.g. de 1024 p/revolución)',
  'G02': 'Encoder síncrono incremental TTL (RS422) de alta resolución',
  'G17': 'Sensor absoluto monovuelta/multivuelta (EnDat o PROFINET)',

  // Painting & Coating
  'F70': 'Acabado pintura especial: color personalizado RAL según requerimiento del cliente',
  'F74': 'Acabado de pintura especial categoría C3 (medio ambiente marino/industrial agresivo)',
  'F75': 'Pintura especial categoría C4 para ambiente químico marino extremadamente agresivo',
  'F76': 'Tratamiento de pintura especial categoría C5 (marino e industrial de alta corrosividad)',

  // Heating
  'G11': 'Calefacción anticondensación integrada (Space heater) para tensión de 230 V CA',
  'G12': 'Calefacción anticondensación integrada para tensión de 115 V CA',

  // Mechanical structures & covers
  'H00': 'Ventilador de material plástico reforzado conductor (antichispas para atmósferas Ex)',
  'H01': 'Ventilación forzada independiente mediante motor adicional monofásico/trifásico acoplado',
  'H02': 'Motor sin ventilador propio y sin tapa de ventilación (modelo autoventilado)',
  'H08': 'Tapa de ventilación doble con tejadillo especial para la industria textil/fibras',
  'H20': 'Tejadillo de protección contra lluvia (rain cover) de chapa galvanizada para montaje vertical',
  'H22': 'Segundo extremo de eje libre (DE y NDE utilizables)',
  'H70': 'Eje libre en extremo no acoplado (NDE) apto para acoplar tacómetro o encoder de terceros',

  // Terminal Box
  'K09': 'Caja de bornes principal montada a la derecha (visto desde el eje DE)',
  'K10': 'Caja de bornes principal montada a la izquierda',
  'K11': 'Caja de bornes principal en la parte inferior (girado 180°)',
  'K20': 'Entrada de cables de mayor sección (prensacables metálico reforzado)',
  'K45': 'Placa de bornes principal con bornes especiales antivibratorios tipo resorte',
  'K82': 'Caja de bornes auxiliar adicional para conexionar termistores y sensores auxiliares',

  // Balancing & Vibration
  'L00': 'Nivel de vibración reducido Clase B (alta precisión de equilibrado para máquinas CNC)',
  'L02': 'Nivel de vibración reducido Clase A especial',

  // Bearings & Greases
  'L20': 'Rodamiento reforzado para mayores cargas radiales en extremo acoplado (rodamiento de rodillos cilíndricos)',
  'L22': 'Rodamientos de alta temperatura con grasa de lubricación sintética hasta +180 °C',
  'L23': 'Rodamientos para baja temperatura con grasa sintética hasta -50 °C',
  'L25': 'Dispositivo de relubricación permanente (muescas de engrase "re-greasing") con niples M10x1',
  'L28': 'Rodamiento aislado eléctricamente en el extremo no acoplado (NDE) para mitigar corrientes de eje por VFD',

  // Climate / Marine
  'M00': 'Ejecución para uso con atmósferas tropicales e insulation antihumedad extrema',
  'M10': 'Ejecución para climas desérticos y calurosos, pintura reflectante solar',
  'M11': 'Certificación y diseño homologado para marina mercante (Lloyd’s Register, DNV-GL, ABS, Bureau Veritas)',

  // Special Plates & Markings
  'Y50': 'Placa de datos adicional metálica (suelta o remachada en el chásis)',
  'Y80': 'Placa de características con textos especiales definidos por el cliente (ej. Número de TAG interno)',
  'Y82': 'Datos de rendimiento grabados especiales alternativos exigidos por regulaciones locales',
  'Y84': 'Logotipo o marca del distribuidor OEM grabada de fábrica en la placa del motor'
};

/**
 * Normalizes input text to reduce OCR noise and improve parsing.
 * Removes vertical pipes '|' or '\' and fixes common typos.
 */
export function normalizeOcrText(text: string): string {
  if (!text) return '';

  return text
    // Replace typical OCR pipe errors that are often read around borders
    .replace(/[|¦\\]/g, ' ')
    // Replace tabs with spaces
    .replace(/\t/g, ' ')
    // Replace duplicate spaces
    .replace(/ +/g, ' ')
    // Correct common OCR noise around numbers
    .replace(/(\d)O/g, '$10') // e.g. "30" read as "3O"
    .replace(/O(\d)/g, '0$1') // e.g. "03" read as "O3"
    // Remove blank/empty lines to look cleaner
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

/**
 * Smart Siemens MLFB corrector that applies positional heuristics to fix common OCR errors.
 * E.g., correcting 'O' to '0' or 'I/L' to '1' in numeric slots, and repairing family prefixes like 65L or 6E57.
 */
export function correctSiemensMlfb(mlfb: string): { corrected: string; adjustmentsMade: string[] } {
  let corrected = mlfb.toUpperCase().trim();
  const adjustmentsMade: string[] = [];

  const replaceAt = (str: string, index: number, replacement: string) => {
    return str.substring(0, index) + replacement + str.substring(index + replacement.length);
  };

  // 1. Correct common family level typos
  if (/^65L/i.test(corrected)) {
    corrected = corrected.replace(/^65L/i, '6SL');
    adjustmentsMade.push("Corregido prefijo '65L' a '6SL'");
  }
  if (/^6E57/i.test(corrected)) {
    corrected = corrected.replace(/^6E57/i, '6ES7');
    adjustmentsMade.push("Corregido prefijo '6E57' a '6ES7'");
  }
  if (/^1LE[IL]/i.test(corrected)) {
    corrected = corrected.replace(/^1LE[IL]/i, '1LE1');
    adjustmentsMade.push("Corregido prefijo '1LEI/L' a '1LE1'");
  }
  if (/^3RTZ/i.test(corrected)) {
    corrected = corrected.replace(/^3RTZ/i, '3RT2');
    adjustmentsMade.push("Corregido prefijo '3RTZ' a '3RT2'");
  }
  if (/^3RVZ/i.test(corrected)) {
    corrected = corrected.replace(/^3RVZ/i, '3RV2');
    adjustmentsMade.push("Corregido prefijo '3RVZ' a '3RV2'");
  }

  // Split by hyphens to look at distinct Siemens blocks
  const blocks = corrected.split('-');
  const charToDigitMap: { [key: string]: string } = {
    'O': '0', 'I': '1', 'L': '1', 'S': '5', 'Z': '2', 'B': '8', 'G': '6'
  };

  const correctDigitSlot = (blockStr: string, index: number, blockName: string, charIndex: number): string => {
    if (index >= blockStr.length) return blockStr;
    const char = blockStr[index];
    if (/[A-Z]/i.test(char)) {
      const mapped = charToDigitMap[char.toUpperCase()];
      if (mapped) {
        adjustmentsMade.push(`Corregido '${char}' no numérico a '${mapped}' en ${blockName} (pos. ${charIndex})`);
        return replaceAt(blockStr, index, mapped);
      }
    }
    return blockStr;
  };

  // Block 1 (length 7, e.g., 6SL3720), locations 5, 6, 7 are digits
  if (blocks.length >= 1) {
    let b1 = blocks[0];
    if (b1.length === 7) {
      b1 = correctDigitSlot(b1, 4, "Bloque 1", 5);
      b1 = correctDigitSlot(b1, 5, "Bloque 1", 6);
      b1 = correctDigitSlot(b1, 6, "Bloque 1", 7);
      blocks[0] = b1;
    }
  }

  // Block 2 (length 5, e.g., 1TG34), position 1 (index 0) and positions 4, 5 (indices 3, 4) are digits
  if (blocks.length >= 2) {
    let b2 = blocks[1];
    if (b2.length === 5) {
      b2 = correctDigitSlot(b2, 0, "Bloque 2", 8);
      b2 = correctDigitSlot(b2, 3, "Bloque 2", 11);
      b2 = correctDigitSlot(b2, 4, "Bloque 2", 12);
      blocks[1] = b2;
    }
  }

  // Block 3 (length 4/5, e.g., 1AA3), position 1 (index 0) and position 4 (index 3) are digits
  if (blocks.length >= 3) {
    let b3 = blocks[2];
    if (b3.length >= 4) {
      b3 = correctDigitSlot(b3, 0, "Bloque 3", 14);
      b3 = correctDigitSlot(b3, 3, "Bloque 3", 17);
      blocks[2] = b3;
    }
  }

  return {
    corrected: blocks.join('-'),
    adjustmentsMade
  };
}

/**
 * Parses raw text from a Siemens ID plate using regex and patterns.
 */
export function parseSiemensPlate(rawText: string): ExtractionResults {
  // Normalize text first
  const cleanText = normalizeOcrText(rawText);
  const lines = cleanText.split('\n');

  // Let's create an empty results object
  const res: ExtractionResults = {
    mlfb: '',
    mlfbFormatted: '',
    mlfbMatchConfidence: 0,
    zCodes: [],
    zExplanation: {},
    serial: '',
    fdDate: '',
    voltage: '',
    current: '',
    power: '',
    speed: '',
    frequency: '',
    cosPhi: '',
    ipRating: '',
    weight: '',
    efficiency: '',
    modelType: 'other',
    mlfbAdjustments: []
  };

  // 1. EXTRACT MLFB (THE HIGHEST PRIORITY)
  // Let's look for known Siemens prefixes or structures
  // Starts with family prefix (3-4 alphanumeric), then 3 to 16 more characters with hyphens or spaces.
  
  let mlfbCandidate = '';
  let confidence = 0;

  // Pattern 1: Classical 16-character / 3-block structure with dashes (e.g. 6ES7315-2AH14-0AB0 or 1LE1001-1DB43-4AF4-Z)
  const mlfbRegex1 = /\b([1-9A-Z]{3,4}\s*[0-9A-Z]{3,4})\s*[-_—–¯]?\s*([0-9A-Z]{5})\s*[-_—–¯]?\s*([0-9A-Z]{4,5})(?:\s*[-_—–¯]\s*(Z|[0-9A-Z]{1,4}))?\b/i;
  
  // Pattern 2: Typical motor 12-character format (e.g. 1LA7083-4AA10)
  const mlfbRegex2 = /\b(1[A-Z0-9]{3})\s*([A-Z0-9]{3})\s*[-_—–¯]?\s*([A-Z0-9]{2})\s*([A-Z0-9]{3})\b/i;

  // Let's evaluate each line to find the best candidate
  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Skip lines that are obviously just metadata like certificates or speed
    if (/^[A-Z]{2,3}\s+\d{4,}/i.test(trimmedLine) && !trimmedLine.toUpperCase().includes('ES7') && !trimmedLine.toUpperCase().includes('6SL')) {
      continue; 
    }

    // Clean logistics/shipping prefixes from the line so MLFB starts cleanly with a word boundary
    const cleanLine = trimmedLine
      .replace(/^(?:MLFB|ORDER\s+NO|CATALOG\s+NUMBER|CATALOG\s+NO|CAT\s+NO|MODEL|REF|PART\s+NO|1P|P\/N|PN|ART\s*-\s*NR)[:.\s=_\-—–]*\b/i, '')
      .trim();

    // Try matching Regex 1 on the cleaned line
    const match1 = cleanLine.match(mlfbRegex1);
    if (match1) {
      const matchStr = match1[0].replace(/\s+/g, '-').replace(/[-_—–¯]+/g, '-').toUpperCase();
      const prefix = matchStr.substring(0, 3);
      if (SIEMENS_FAMILIES[prefix] || ['6ES', '6SL', '1LA', '1LE', '1LG', '3RT', '3RV', '1FK', '1FT', '6AV', '6EP'].includes(prefix) || prefix.startsWith('1') || prefix.startsWith('3') || prefix.startsWith('5') || prefix.startsWith('6')) {
        mlfbCandidate = matchStr;
        confidence = 90;
        break; // Excellent match
      } else {
        mlfbCandidate = matchStr;
        confidence = 65;
      }
    }

    // Try regex 2 on the cleaned line
    const match2 = cleanLine.match(mlfbRegex2);
    if (match2) {
      const formatted = `${match2[1]}${match2[2]}-${match2[3]}${match2[4]}`.toUpperCase();
      mlfbCandidate = formatted;
      confidence = 85;
      break;
    }
  }

  // If no match by standard regex, let's look for strings starting with a known Siemens prefix
  if (!mlfbCandidate) {
    for (const prefix of Object.keys(SIEMENS_FAMILIES)) {
      const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const prefixRegex = new RegExp(`\\b(${escapedPrefix}[A-Z0-9-.]{8,20})\\b`, 'i');
      for (const line of lines) {
        const cleanLine = line.replace(/^(?:MLFB|ORDER\s+NO|1P|PART\s+NO)[:.\s=_\-—–]*/i, '').trim();
        const pMatch = cleanLine.match(prefixRegex);
        if (pMatch) {
          mlfbCandidate = pMatch[1].replace(/[-_—–¯]+/g, '-').toUpperCase();
          confidence = 75;
          break;
        }
      }
      if (mlfbCandidate) break;
    }
  }

  // If still nothing, search for generic dash-separated structures
  if (!mlfbCandidate) {
    const backupRegex = /\b([0-9A-Z]{4,7}-[0-9A-Z]{5}-[0-9A-Z]{4,5}(-Z)?)\b/i;
    for (const line of lines) {
      const bMatch = line.match(backupRegex);
      if (bMatch) {
        mlfbCandidate = bMatch[1].toUpperCase();
        confidence = 50;
        break;
      }
    }
  }

  // Set the parsed MLFB
  if (mlfbCandidate) {
    mlfbCandidate = mlfbCandidate.replace(/^-+|-+$/g, '');
    const rawMlfb = mlfbCandidate.replace(/[^A-Z0-9-]/gi, ''); // clean other characters
    
    // Apply smart high-fidelity corrections to OCR mistakes
    const correctionResult = correctSiemensMlfb(rawMlfb);
    res.mlfb = correctionResult.corrected;
    res.mlfbFormatted = correctionResult.corrected;
    res.mlfbAdjustments = correctionResult.adjustmentsMade;
    res.mlfbMatchConfidence = correctionResult.adjustmentsMade.length > 0 ? Math.min(confidence + 10, 95) : confidence;

    // Detect family details
    const prefix3 = res.mlfb.substring(0, 3);
    let matchedFamily = SIEMENS_FAMILIES[prefix3];
    
    if (!matchedFamily && prefix3.startsWith('6ES')) {
      matchedFamily = SIEMENS_FAMILIES['6ES'];
    }

    if (matchedFamily) {
      res.modelType = matchedFamily.category;
      res.mlfbParts = {
        family: matchedFamily.name,
        type: res.mlfb.length > 7 ? res.mlfb.substring(4, 7) : '',
        suffix: res.mlfb.length > 8 ? res.mlfb.substring(8) : ''
      };
    }
  }

  // 2. EXTRACT Z-CODES / OPTIONS
  // Typical representation in raw text:
  // - "Z = A11 + K20"
  // - "-Z A11+K20+L20"
  // - "Z: A11 K20"
  // - "Option Z : G11"
  // Let's search lines containing "Z" / "Z-Option" / "Z=" / "Z:" or "OPCION Z"
  let zTextContext = '';
  const zCodeRegex = /\b([A-Z]\d{2})\b/g;

  // Let's check lines for "Z" indicators
  for (const line of lines) {
    const upperLine = line.toUpperCase();
    if (upperLine.includes(' Z ') || upperLine.includes('-Z') || upperLine.includes('Z=') || upperLine.includes('Z:') || upperLine.includes('OPCION') || upperLine.includes('OPTION')) {
      zTextContext += ' ' + line;
    }
  }

  // Extract all 3-char codes conforming to [A-Z]\d{2} (like A11, K20) from the context or the entire page
  const foundCodes = new Set<string>();
  
  if (zTextContext) {
    let match;
    while ((match = zCodeRegex.exec(zTextContext)) !== null) {
      foundCodes.add(match[1].toUpperCase());
    }
  }

  // If we found nothing in the direct Z context lines, let's scan the whole text for potential codes.
  // We exclude codes that match parts of the MLFB or standard ratings (like IP55 -> P55 might look like a Z-code, IE3 -> E3 is not 3 chars).
  // Also common words or standard ratings shouldn't be added.
  if (foundCodes.size === 0) {
    const globalMatches = cleanText.toUpperCase().match(/\b([A-Z]\d{2})\b/g);
    if (globalMatches) {
      globalMatches.forEach(code => {
        // Make sure it's not a common false positive (like V400, kW11, Hz50, CLF -> F05)
        // Ensure it's in our Siemens Z-Codes database, which validates it's a REAL Siemens option!
        if (SIEMENS_Z_CODES[code]) {
          foundCodes.add(code);
        }
      });
    }
  }

  // Map found Z-codes to their explanations
  res.zCodes = Array.from(foundCodes);
  res.zCodes.forEach(code => {
    if (res.zCodes.length && res.zExplanation) {
      res.zExplanation[code] = SIEMENS_Z_CODES[code] || 'Opción Siemens personalizada (Detalles técnicos según catálogo)';
    }
  });

  // 3. EXTRACT SERIAL NUMBER (No. / SERIAL / S No. / F-Nr)
  // Patterns: "No. UD 1502446" or "N-1234567" or "S-No: 1234"
  const serialRegex = /(?:No\s*\.?\s*|SERIAL\s*\.?\s*|S\s*No\s*\.?\s*|F-Nr\s*\.?\s*|FABR\s*-\s*NR\s*\.?\s*|N\s*-\s*)([A-Z0-9\s-]{5,18})/i;
  for (const line of lines) {
    const sMatch = line.match(serialRegex);
    if (sMatch) {
      // Clean extracted serial number (remove trailing trash)
      const cleanSerial = sMatch[1].trim().replace(/^(?:UD|FD)\s+/i, '');
      if (cleanSerial && cleanSerial.length > 4) {
        res.serial = cleanSerial;
        break;
      }
    }
  }

  // Fallback for serial: look for lines starting with "UD " (often prefix for motor serial), or "FD "
  if (!res.serial) {
    const udRegex = /\b(UD\s*[0-9]{5,})\b/i;
    for (const line of lines) {
      const udMatch = line.match(udRegex);
      if (udMatch) {
        res.serial = udMatch[1];
        break;
      }
    }
  }

  // 4. MANUFACTURING DATE (FD CODE)
  // FD code has 4 digits: e.g. "FD 1503" or "FD1503" (Year 2015, Month 03) or "F.D. 1204"
  const fdRegex = /\bFD\s*[:.-]?\s*(\d{4})\b/i;
  for (const line of lines) {
    const fdMatch = line.match(fdRegex);
    if (fdMatch) {
      const code = fdMatch[1];
      const yearPrefix = parseInt(code.substring(0, 2)) > 70 ? '19' : '20';
      const year = yearPrefix + code.substring(0, 2);
      const month = code.substring(2, 4);
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthStr = months[parseInt(month) - 1] || month;
      res.fdDate = `${monthStr} ${year} (Código FD ${code})`;
      break;
    }
  }

  // 5. EXTRACT MOTOR TECHNICAL PARAMETERS

  // VOLTAGE (V) - e.g. 230/400 V, 400Y, 690D, 380-415 V, 400 V ∆
  // Often written as a range or with indicators
  const voltageRegex = /\b(\d{3}\s*(?:\/\s*\d{3})?)\s*V\b|V\s*[:.-]?\s*(\d{3}(?:\/\d{3})?)\b|\b(\d{3}[D∆Y]?\s*(?:\/\s*\d{3}[D∆Y]?)?)\s*V\b/i;
  for (const line of lines) {
    const vMatch = line.match(voltageRegex);
    if (vMatch) {
      res.voltage = (vMatch[1] || vMatch[2] || vMatch[3]).trim() + ' V';
      break;
    }
  }
  // Try backup voltage search for three-phase typical (230/400 or 400/690)
  if (!res.voltage) {
    const vMatchBackup = cleanText.match(/\b(220|230|380|400|415|440|460|660|690)\s*\/\s*(380|400|415|440|460|660|690)\s*V?/i);
    if (vMatchBackup) {
      res.voltage = vMatchBackup[0].includes('V') ? vMatchBackup[0] : vMatchBackup[0] + ' V';
    }
  }

  // CURRENT (A) - e.g. 11.4/6.6 A, 1.5 A, 3.2 A
  const currentRegex = /\b(\d+(?:\.\d+)?\s*(?:\/\s*\d+(?:\.\d+)?)?)\s*(?:A|Amp)\b/i;
  for (const line of lines) {
    // Avoid mixing with speed "A" or model codes
    if (!line.includes('RPM') && !line.includes('r/min') && !line.includes('KW') && !line.includes('cos')) {
      const aMatch = line.match(currentRegex);
      if (aMatch) {
        res.current = aMatch[1].trim() + ' A';
        break;
      }
    }
  }

  // POWER (kW or HP) - e.g. 5.5 kW, 11kw, 7.5 HP, 0.75kW
  const powerRegex = /\b(\d+(?:\.\d+)?)\s*(?:kW|kw|KW|Hp|HP|hp)\b/i;
  for (const line of lines) {
    const pMatch = line.match(powerRegex);
    if (pMatch) {
      const num = pMatch[1];
      const unit = pMatch[0].toLowerCase().includes('hp') ? 'HP' : 'kW';
      res.power = `${num} ${unit}`;
      break;
    }
  }

  // SPEED (RPM) - e.g. 1450 RPM, 1450 min-1, 2920 r/min
  const speedRegex = /\b(\d{3,4})\s*(?:RPM|rpm|r\/min|min\s*-\s*1|min-1|\/min)\b/i;
  for (const line of lines) {
    const rMatch = line.match(speedRegex);
    if (rMatch) {
      res.speed = rMatch[1] + ' RPM';
      break;
    }
  }
  // Try common motor speeds if not labeled
  if (!res.speed) {
    const rMatchBackup = cleanText.match(/\b(720|730|945|950|960|1420|1430|1440|1450|1460|1470|1480|2880|2900|2910|2920|2930|2940|2950|1750|3550)\b/);
    if (rMatchBackup) {
      res.speed = rMatchBackup[1] + ' RPM';
    }
  }

  // FREQUENCY (Hz) - e.g. 50 Hz, 60Hz
  const hzRegex = /\b(50|60)\s*Hz\b/i;
  const hzMatch = cleanText.match(hzRegex);
  if (hzMatch) {
    res.frequency = hzMatch[1] + ' Hz';
  } else {
    // Siemens is standardly 50 Hz or 60 Hz
    if (cleanText.includes('50 Hz') || cleanText.includes('50Hz')) res.frequency = '50 Hz';
    else if (cleanText.includes('60 Hz') || cleanText.includes('60Hz')) res.frequency = '60 Hz';
  }

  // COSINE PHI (POWER FACTOR) - e.g. cos φ 0.81, cos phi 0.82, PF 0.85
  const cosPhiRegex = /(?:cos\s*[qpφϕф]ⓟ?|PF|cos\s*phi)\s*[:.-]?\s*([0-1]\.\d{2})/i;
  const cosMath = cleanText.match(cosPhiRegex);
  if (cosMath) {
    res.cosPhi = cosMath[1];
  }

  // PROTECTION RATING (IP) - e.g. IP 55, IP56, IP65
  const ipRegex = /\bIP\s*(\d{2})\b/i;
  const ipMatch = cleanText.match(ipRegex);
  if (ipMatch) {
    res.ipRating = 'IP' + ipMatch[1];
  }

  // WEIGHT - e.g. 45 kg, 120kg
  const kgRegex = /\b(\d+(?:\.\d+)?)\s*kg\b/i;
  const kgMatch = cleanText.match(kgRegex);
  if (kgMatch) {
    res.weight = kgMatch[1] + ' kg';
  }

  // EFFICIENCY - e.g. IE3 - 88.5% or EFF 87.5
  const effClassRegex = /\b(IE[1-4])\b/i;
  const effPercentRegex = /\b(\d{2}(?:\.\d+)?)\s*%\b/;
  const effClassMatch = cleanText.match(effClassRegex);
  const effPercentMatch = cleanText.match(effPercentRegex);
  
  if (effClassMatch && effPercentMatch) {
    res.efficiency = `${effClassMatch[1].toUpperCase()} (${effPercentMatch[1]}%)`;
  } else if (effClassMatch) {
    res.efficiency = effClassMatch[1].toUpperCase();
  } else if (effPercentMatch) {
    // Often efficiency percent is on the plate like "IE3 91.2%"
    // Let's just grab the percent if it falls between 70 to 98
    const pct = parseFloat(effPercentMatch[1]);
    if (pct > 70 && pct < 98) {
      res.efficiency = `${pct}%`;
    }
  }

  // Guess model type based on other ratings
  if (res.modelType === 'other') {
    if (res.speed || res.voltage || res.cosPhi) {
      res.modelType = 'motor';
    } else if (cleanText.toUpperCase().includes('SIMATIC') || cleanText.toUpperCase().includes('CPU') || cleanText.toUpperCase().includes('DIAG')) {
      res.modelType = 'plc';
    } else if (cleanText.toUpperCase().includes('SINAMICS') || cleanText.toUpperCase().includes('DRIVE') || cleanText.toUpperCase().includes('INVERTER')) {
      res.modelType = 'vfd';
    }
  }

  return res;
}
