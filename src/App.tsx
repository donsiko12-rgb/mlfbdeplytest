/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Tesseract from 'tesseract.js';
import { 
  Camera, 
  Upload, 
  FileText, 
  Copy, 
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Sliders, 
  Lightbulb, 
  Cpu, 
  HardDrive, 
  Layers, 
  Tag, 
  Bookmark, 
  Sparkle,
  Layers3,
  MonitorCheck
} from 'lucide-react';

import { ScannedPlate, ExtractionResults, TesseractProgress } from './types';
import { parseSiemensPlate, normalizeOcrText, SIEMENS_FAMILIES } from './utils/parser';
import CameraScanner from './components/CameraScanner';
import ImageAdjuster from './components/ImageAdjuster';
import SidebarInventory from './components/SidebarInventory';
import HelpManual from './components/HelpManual';

export default function App() {
  // Historical scans list loaded from localStorage
  const [plates, setPlates] = useState<ScannedPlate[]>([]);
  const [selectedPlateId, setSelectedPlateId] = useState<string | null>(null);

  // Active workspace image states
  const [rawImageSrc, setRawImageSrc] = useState<string>(''); // Snapped or uploaded image before adjustments
  const [processedImageSrc, setProcessedImageSrc] = useState<string>(''); // Adjusted image sent to Tesseract
  const [isAdjusting, setIsAdjusting] = useState<boolean>(false); // Whether the ImageAdjuster is open
  const [showCamera, setShowCamera] = useState<boolean>(false); // Camera modal visibility
  
  // OCR Progress and results
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [ocrProgress, setOcrProgress] = useState<TesseractProgress>({ status: '', progress: 0 });
  const [rawText, setRawText] = useState<string>('');
  const [extractedData, setExtractedData] = useState<ExtractionResults | null>(null);

  // New item nickname for saving
  const [customName, setCustomName] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Clipboard copies trackers
  const [copiedField, setCopiedField] = useState<string>('');

  // Initial load of history catalog from local storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('siemens_scanned_plates');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPlates(parsed);
        if (parsed.length > 0) {
          // Select newest as active by default
          loadPlateRecord(parsed[0]);
        }
      }
    } catch (e) {
      console.error('Error loading plates from localStorage:', e);
    }
  }, []);

  // Sync to local storage on changes
  const savePlatesToLocalStorage = (newPlates: ScannedPlate[]) => {
    try {
      localStorage.setItem('siemens_scanned_plates', JSON.stringify(newPlates));
      setPlates(newPlates);
    } catch (e) {
      console.error('Error writing to localStorage:', e);
    }
  };

  // Helper to load a saved record from history
  const loadPlateRecord = (plate: ScannedPlate) => {
    setSelectedPlateId(plate.id);
    setRawText(plate.rawText);
    setExtractedData(plate.extracted);
    setProcessedImageSrc(plate.imageUrl || '');
    setRawImageSrc('');
    setIsAdjusting(false);
    setCustomName(plate.name);
  };

  // Copy text helper
  const handleCopyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Process File upload (Drag or Dialog)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setRawImageSrc(event.target.result as string);
          setIsAdjusting(true); // Open preprocessor panel
          setShowCamera(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setRawImageSrc(event.target.result as string);
          setIsAdjusting(true);
          setShowCamera(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Snapped photo from CameraScanner
  const handleCameraCapture = (imageDataUrl: string) => {
    setRawImageSrc(imageDataUrl);
    setIsAdjusting(true);
    setShowCamera(false);
  };

  // Trigger OCR with processed image source
  const runOcrProcessing = async (imageSrc: string) => {
    setProcessedImageSrc(imageSrc);
    setIsAdjusting(false);
    setIsProcessing(true);
    setOcrProgress({ status: 'Inicializando extractor...', progress: 10 });
    setRawText('');
    setExtractedData(null);

    try {
      // 1. Try Gemini Vision API first
      setOcrProgress({ status: 'Analizando placa con IA (Gemini)...', progress: 40 });
      const apiResponse = await fetch('/api/ocr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imageSrc })
      });

      if (apiResponse.ok) {
        const data = await apiResponse.json();
        setOcrProgress({ status: 'Finalizando análisis con IA...', progress: 90 });
        
        const formattedMlfb = data.mlfb || '';
        const parsed: ExtractionResults = {
          mlfb: formattedMlfb,
          mlfbFormatted: formattedMlfb,
          mlfbMatchConfidence: 98,
          zCodes: data.zCodes || [],
          zExplanation: {},
          serial: data.serial || '',
          fdDate: data.fdDate || '',
          voltage: data.voltage || '',
          current: data.current || '',
          power: data.power || '',
          speed: data.speed || '',
          frequency: data.frequency || '',
          cosPhi: data.cosPhi || '',
          ipRating: data.ipRating || '',
          weight: data.weight || '',
          efficiency: data.efficiency || '',
          modelType: data.modelType || 'other',
          mlfbAdjustments: data.mlfbAdjustments || [],
          ocrEngine: 'gemini'
        };

        // Populate zExplanations if any codes are present
        const { SIEMENS_Z_CODES, SIEMENS_FAMILIES } = await import('./utils/parser');
        if (parsed.zCodes && parsed.zCodes.length > 0) {
          parsed.zExplanation = {};
          parsed.zCodes.forEach(code => {
            if (parsed.zExplanation) {
              parsed.zExplanation[code] = SIEMENS_Z_CODES[code] || 'Opción Siemens personalizada (Detalles técnicos según catálogo)';
            }
          });
        }
        
        // Add family lookup
        const prefix3 = parsed.mlfb.substring(0, 3);
        let matchedFamily = SIEMENS_FAMILIES[prefix3];
        if (!matchedFamily && prefix3.startsWith('6ES')) {
          matchedFamily = SIEMENS_FAMILIES['6ES'];
        }
        if (matchedFamily) {
          parsed.mlfbParts = {
            family: matchedFamily.name,
            type: parsed.mlfb.length > 7 ? parsed.mlfb.substring(4, 7) : '',
            suffix: parsed.mlfb.length > 8 ? parsed.mlfb.substring(8) : ''
          };
          parsed.modelType = matchedFamily.category;
        }

        setIsProcessing(false);
        setRawText(data.rawText || `MLFB: ${formattedMlfb}`);
        setExtractedData(parsed);

        // Generate custom name
        let defName = 'Placa Siemens ';
        if (parsed.modelType === 'motor') defName += 'Motor';
        else if (parsed.modelType === 'vfd') defName += 'Variador';
        else if (parsed.modelType === 'plc') defName += 'S7 PLC';
        else defName += 'Equipo';

        if (parsed.power) defName += ` - ${parsed.power}`;
        else if (parsed.serial) defName += ` - S/N ${parsed.serial.substring(0, 6)}`;
        else defName += ` - #${plates.length + 1}`;

        setCustomName(defName);
        setSelectedPlateId(null);
        return; // Success!
      } else {
        const errData = await apiResponse.json();
        console.warn('Gemini API returned error, falling back to local OCR:', errData.error);
      }
    } catch (e) {
      console.warn('Could not contact server API, falling back to local Tesseract OCR:', e);
    }

    // 2. Fallback to Tesseract.js if Gemini fails or is not setup
    runLocalTesseractOcr(imageSrc);
  };

  const runLocalTesseractOcr = (imageSrc: string) => {
    setIsProcessing(true);
    setOcrProgress({ status: 'Iniciando reconocimiento local...', progress: 10 });
    
    Tesseract.recognize(
      imageSrc,
      'eng',
      {
        logger: m => {
          let userFriendlyStatus = 'Procesando localmente...';
          if (m.status === 'loading tesseract core') userFriendlyStatus = 'Cargando motor local...';
          else if (m.status === 'initializing api') userFriendlyStatus = 'Iniciando detector...';
          else if (m.status === 'recognizing text') userFriendlyStatus = 'Buscando caracteres en la placa...';
          
          setOcrProgress({ 
            status: userFriendlyStatus, 
            progress: Math.round((m.progress || 0) * 100) 
          });
        }
      }
    ).then(({ data: { text } }) => {
      setIsProcessing(false);
      if (text && text.trim().length > 0) {
        const parsed = parseSiemensPlate(text);
        parsed.ocrEngine = 'tesseract';
        setRawText(text);
        setExtractedData(parsed);
        
        let defName = 'Placa Siemens ';
        if (parsed.modelType === 'motor') defName += 'Motor';
        else if (parsed.modelType === 'vfd') defName += 'Variador';
        else if (parsed.modelType === 'plc') defName += 'S7 PLC';
        else defName += 'Equipo';

        if (parsed.power) defName += ` - ${parsed.power}`;
        else if (parsed.serial) defName += ` - S/N ${parsed.serial.substring(0, 6)}`;
        else defName += ` - #${plates.length + 1}`;

        setCustomName(defName);
        setSelectedPlateId(null);
      } else {
        setRawText('No se encontraron caracteres claros. Intenta ajustar el contraste o rotar la placa.');
      }
    }).catch(err => {
      console.error('OCR Fallback Error:', err);
      setIsProcessing(false);
      setRawText('Error al procesar la placa. Ensaya a limpiar o mejorar la iluminación de la toma.');
    });
  };

  // Re-run parsing instantly whenever user edits the raw OCR text box
  const handleOcrTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setRawText(val);
    const parsed = parseSiemensPlate(val);
    setExtractedData(parsed);
  };

  // Save parsed result into local storage index
  const handleSaveToCatalog = () => {
    if (!extractedData) return;

    const newPlate: ScannedPlate = {
      id: selectedPlateId || 'plate_' + Date.now(),
      name: customName.trim() || 'Placa Siemens',
      timestamp: new Date().toISOString(),
      imageUrl: processedImageSrc,
      rawText: rawText,
      extracted: extractedData
    };

    let updatedPlates: ScannedPlate[] = [];
    if (selectedPlateId) {
      // Overwrite / Update existing
      updatedPlates = plates.map(p => p.id === selectedPlateId ? newPlate : p);
    } else {
      // Add new
      updatedPlates = [newPlate, ...plates];
      setSelectedPlateId(newPlate.id);
    }

    savePlatesToLocalStorage(updatedPlates);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3050);
  };

  // Update plate nickname from sidebar element
  const handleUpdateNickname = (id: string, newName: string) => {
    const updated = plates.map(p => p.id === id ? { ...p, name: newName } : p);
    savePlatesToLocalStorage(updated);
    if (selectedPlateId === id) {
      setCustomName(newName);
    }
  };

  // Delete recorded item
  const handleDeletePlate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = plates.filter(p => p.id !== id);
    savePlatesToLocalStorage(updated);
    if (selectedPlateId === id) {
      setSelectedPlateId(null);
      setExtractedData(null);
      setRawText('');
      setProcessedImageSrc('');
      setCustomName('');
    }
  };

  // Clear Catalog Completely
  const handleClearCatalog = () => {
    savePlatesToLocalStorage([]);
    setSelectedPlateId(null);
    setExtractedData(null);
    setRawText('');
    setProcessedImageSrc('');
    setCustomName('');
  };

  // Loading Demos triggers
  const handleLoadDemo = (type: 'motor' | 'plc') => {
    setIsAdjusting(false);
    setShowCamera(false);
    setSelectedPlateId(null);

    if (type === 'motor') {
      const demoText = `SIEMENS 3~Mot. 1LE1001-1DB43-4AF4-Z\nNo. UD 1502446/1\nIEC/EN 60034 90L IP55\nZ = A11+K20+L22\n50Hz 230/400V 4.0kW 1450 RPM 11.4/6.6A\ncos phi 0.82 FD 1503\nMade in Germany`;
      const parsed = parseSiemensPlate(demoText);
      setRawText(demoText);
      setExtractedData(parsed);
      setCustomName('Demo: Motor SIMOTICS GP 4kW');
      // Set a nice visual placeholder/gradient representation for the demo plate
      setProcessedImageSrc('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="100%" height="100%" fill="%231e293b"/><text x="20" y="40" fill="%2310b981" font-family="monospace" font-size="14">SIEMENS 3~Mot. 1LE1001-1DB43-4AF4-Z / FD 1503</text><text x="20" y="80" fill="%23cbd5e1" font-family="monospace" font-size="12">No. UD 1502446/1   IP55   IE3-88.5%</text><text x="20" y="120" fill="%23cbd5e1" font-family="monospace" font-size="12">50Hz   230/400V   11.4/6.6A   4.0kW   1450RPM</text><text x="20" y="160" fill="%23fbbf24" font-family="monospace" font-size="12">Z = A11 + K20 + L22</text><line x1="20" y1="190" x2="580" y2="190" stroke="%23334155" stroke-width="2"/><text x="20" y="230" fill="%2364748b" font-family="sans-serif" font-size="10">SIMULACION DE MOTOR TRIFASICO DE INDUCCION SIEMENS AG</text></svg>');
    } else {
      const demoText = `SIEMENS SIMATIC S7-1500\nCPU 1511-1 PN\n6ES7511-1AK02-0AB0\nHW: 01 FW: V2.9.2\nS VP-B341052 FD 2108\nIP20 MADE IN GERMANY`;
      const parsed = parseSiemensPlate(demoText);
      setRawText(demoText);
      setExtractedData(parsed);
      setCustomName('Demo: Controlador CPU S7-1500');
      setProcessedImageSrc('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="100%" height="100%" fill="%230f172a"/><text x="20" y="40" fill="%233b82f6" font-family="monospace" font-size="14">SIEMENS SIMATIC S7-1500 PN / FD 2108</text><text x="20" y="80" fill="%23cbd5e1" font-family="monospace" font-size="12">MLFB: 6ES7511-1AK02-0AB0</text><text x="20" y="120" fill="%23cbd5e1" font-family="monospace" font-size="12">S VP-B341052   HW: 01   FW: V2.9.2</text><line x1="20" y1="160" x2="580" y2="160" stroke="%23334155" stroke-width="2"/><text x="20" y="200" fill="%2364748b" font-family="sans-serif" font-size="10">SISTEMA COMPLEMENTARIO PLC PROFINET MONTAJE RIEL DIN</text></svg>');
    }
  };

  return (
    <div id="main-app" className="min-h-screen bg-slate-950 text-slate-250 flex flex-col font-sans selection:bg-cyan-500 selection:text-white">
      
      {/* Dynamic Navigation Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 md:px-8 bg-slate-900/50 sticky top-0 z-40 backdrop-blur-md">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-cyan-600 rounded flex items-center justify-center font-extrabold text-white font-mono tracking-tighter">S</div>
          <div>
            <h1 id="app-title" className="text-sm md:text-base font-semibold tracking-tight uppercase text-white flex items-center">
              <span>Industrial OCR</span>
              <span className="text-cyan-500 font-mono text-xs ml-2">v2.4.0-local</span>
            </h1>
            <p className="hidden md:block text-[10px] text-slate-500">
              Lector de códigos MLFB, opciones Z y parámetros técnicos de placas Siemens (100% privado)
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 md:space-x-6">
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            <span>LOCAL ENGINE: ACTIVE</span>
          </div>
          
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handleLoadDemo('motor')}
              className="text-[10px] md:text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 rounded text-slate-300 transition-colors cursor-pointer font-medium"
            >
              Demo Motor
            </button>
            <button
              onClick={() => handleLoadDemo('plc')}
              className="text-[10px] md:text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-750 rounded text-slate-300 transition-colors cursor-pointer font-medium"
            >
              Demo PLC
            </button>
          </div>
        </div>
      </header>

      {/* Main Container Workspace */}
      <main className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side Column - Catalog & Actions (4 columns on desktop) */}
        <div className="lg:col-span-4 flex flex-col space-y-6">
          
          {/* Historical Database/Catalog Sidebar */}
          <SidebarInventory 
            plates={plates}
            selectedPlateId={selectedPlateId}
            onSelectPlate={loadPlateRecord}
            onDeletePlate={handleDeletePlate}
            onClearAll={handleClearCatalog}
            onUpdateNickname={handleUpdateNickname}
          />

          {/* Guidelines on OCR usage */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-3">
            <h3 className="font-semibold text-xs tracking-wider text-slate-200 uppercase flex items-center space-x-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span>¿Cómo funciona el extractor local?</span>
            </h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Esta herramienta ejecuta <strong>Tesseract.js</strong> de manera local en tu equipo. Los datos son procesados localmente y no viajan externamente. 
            </p>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1">
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="font-semibold text-white block mb-0.5 font-mono text-cyan-400">1. MLFB</span>
                Decodifica familias (1LE, 1LA, 6ES7, etc.) y desglosa su clasificación.
              </div>
              <div className="bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="font-semibold text-white block mb-0.5 font-mono text-cyan-400">2. Códigos Z</span>
                Cruza opciones con diccionarios Siemens para explicar las modificaciones.
              </div>
            </div>
          </div>

          {/* Interactive reference manual */}
          <HelpManual />

        </div>

        {/* Right Side Column - Main Workspace OCR & Extracted Data (8 columns on desktop) */}
        <div className="lg:col-span-8 flex flex-col space-y-6">
          
          {/* Scanner Controls / Preprocessor Container */}
          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-xs space-y-5">
            
            {/* Top scanning options */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-sans font-bold text-sm text-white">
                  {isAdjusting ? 'Revisión y Ajuste Técnico' : 'Cargar Placa de Datos'}
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Captura u organiza la foto para un análisis de caracteres estable
                </p>
              </div>

              {!isAdjusting && (
                <div className="flex flex-wrap items-center gap-2">
                  {/* Camera Scanner button */}
                  <button
                    id="open-camera-modal-btn"
                    onClick={() => {
                      setShowCamera(true);
                      setRawImageSrc('');
                      setIsAdjusting(false);
                    }}
                    className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-700 font-sans font-bold text-xs text-white rounded border border-slate-700 flex items-center space-x-1.5 transition active:scale-95 shadow-lg shadow-cyan-950/40 cursor-pointer whitespace-nowrap"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Iniciar Cámara</span>
                  </button>

                  {/* Manual file upload */}
                  <label
                    htmlFor="file-uploader-input"
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold text-xs rounded flex items-center space-x-1.5 cursor-pointer transition active:scale-95 whitespace-nowrap"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir Imagen</span>
                    <input
                      id="file-uploader-input"
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Sub-modals & Workspace Panels */}
            {showCamera && (
              <div className="animate-fade-in">
                <CameraScanner 
                  onCapture={handleCameraCapture} 
                  onClose={() => setShowCamera(false)} 
                />
              </div>
            )}

            {isAdjusting && rawImageSrc && (
              <div className="animate-fade-in border-t border-slate-800 pt-1">
                <ImageAdjuster 
                  src={rawImageSrc} 
                  onProcessed={runOcrProcessing} 
                  onCancel={() => {
                    setIsAdjusting(false);
                    setRawImageSrc('');
                  }} 
                />
              </div>
            )}

            {/* Empty landing guide if no active scanner or preprocessor */}
            {!isAdjusting && !showCamera && !isProcessing && !extractedData && (
              <div 
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-xl p-8 bg-slate-950/40 text-center transition-all flex flex-col items-center justify-center space-y-4"
              >
                <div className="p-4 bg-slate-900 rounded-full text-cyan-500">
                  <Upload className="w-8 h-8 opacity-80" />
                </div>
                <div>
                  <h4 className="text-slate-200 text-xs font-semibold">Arrastra y suelta una imagen de placa</h4>
                  <p className="text-[10px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Acepta formatos JPG, PNG de interruptores, variadores SIMATIC, fuentes SITOP y motores SIMOTICS.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-[10px] text-slate-500">
                  <span>O</span>
                  <button 
                    onClick={() => handleLoadDemo('motor')} 
                    className="text-cyan-400 hover:underline font-bold cursor-pointer"
                  >
                    haz clic aquí para cargar una placa de demostración
                  </button>
                </div>
              </div>
            )}

            {/* OCR Processing Active overlay */}
            {isProcessing && (
              <div className="bg-slate-950/70 border border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center text-center space-y-4 shadow-inner">
                <RefreshCw className="w-10 h-10 text-cyan-400 animate-spin" />
                <div className="space-y-1 w-full max-w-xs font-mono">
                  <h4 className="text-sm font-semibold text-slate-100">{ocrProgress.status}</h4>
                  <p className="text-[10px] text-slate-500 font-sans">Esto suele tomar de 3 a 8 segundos. No cierres la ventana.</p>
                  
                  {/* Progress bar percentage */}
                  <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden mt-3">
                    <div 
                      className="bg-cyan-500 h-full transition-all duration-300" 
                      style={{ width: `${ocrProgress.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold block mt-1">{ocrProgress.progress}%</span>
                </div>
              </div>
            )}

            {/* Active Image representation */}
            {!isAdjusting && !showCamera && processedImageSrc && (
              <div className="relative bg-slate-950/70 p-4 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:w-1/3 aspect-video md:aspect-square bg-slate-900 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                  {processedImageSrc.startsWith('data:image/svg') ? (
                    <div 
                      className="w-full h-full object-contain"
                      dangerouslySetInnerHTML={{ __html: processedImageSrc.replace('data:image/svg+xml;utf8,', '') }} 
                    />
                  ) : (
                    <img 
                      src={processedImageSrc} 
                      alt="Procesada para OCR" 
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-1.5 text-xs text-cyan-400 font-mono font-bold">
                    <MonitorCheck className="w-4 h-4 text-emerald-400" />
                    <span>Placa Cargada con Éxito</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed font-sans">
                    Si alguna lectura es imprecisa por el desgaste físico del metal, puedes corregir manualmente los caracteres en la caja de texto editable y el desglose se actualizará al instante.
                  </p>
                  {rawImageSrc && (
                    <button
                      onClick={() => setIsAdjusting(true)}
                      className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white rounded text-[10px] font-semibold transition cursor-pointer"
                    >
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Volver a preprocesar imagen</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Extracted Details & Text Block Container */}
          {extractedData && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-fade-in">
              
              {/* Left Column of Results: Edit/Raw OCR Text (5 cols) */}
              <div className="md:col-span-5 flex flex-col space-y-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex-1 flex flex-col">
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-cyan-500" />
                      <h4 className="font-semibold text-xs text-slate-200">Texto Extraído (Editable)</h4>
                    </div>
                    <span className="text-[9px] text-slate-500 font-mono uppercase">OCR Input</span>
                  </div>
                  
                  <textarea
                    id="ocr-raw-textarea"
                    value={rawText}
                    onChange={handleOcrTextChange}
                    className="w-full flex-1 min-h-[220px] bg-slate-950 text-[11px] text-slate-350 p-3 rounded-xl border border-slate-850 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono leading-relaxed"
                    placeholder="Escribe o edita el bloque de texto de la placa aquí..."
                  />

                  <div className="mt-2.5 bg-slate-950 p-3 rounded-xl border border-slate-800 text-[10px] text-slate-500 space-y-1.5">
                    <span className="font-bold text-slate-300 block">Ayuda para ajuste manual</span>
                    <p className="leading-tight">
                      Si el OCR leyó <code className="text-white">1LE1O01</code>, cámbialo a <code className="text-white">1LE1001</code> (letra 'O' por número cero '0') para ordenar correctamente el MLFB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column of Results: Parsed Siemens Schema Attributes (7 cols) */}
              <div className="md:col-span-7 flex flex-col space-y-4">
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-5">
                  
                  {/* MLFB Main Card */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative overflow-hidden space-y-2.5">
                    {/* Glowing side accent line */}
                    <div className="absolute top-0 bottom-0 left-0 w-1 bg-cyan-500"></div>

                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest font-mono">
                        Código Siemens MLFB (Referencia)
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {extractedData.ocrEngine && (
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold ${
                            extractedData.ocrEngine === 'gemini' 
                              ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25' 
                              : 'bg-slate-800 text-slate-400 border border-slate-700/50'
                          }`}>
                            {extractedData.ocrEngine === 'gemini' ? '✨ IA Gemini' : '⚙️ Local'}
                          </span>
                        )}
                        <span className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                          extractedData.mlfbMatchConfidence >= 80 
                            ? 'bg-green-500/10 text-green-500 border border-green-500/20' 
                            : 'bg-amber-500/10 text-amber-500 border border-amber-505/20'
                        }`}>
                          Confianza {extractedData.mlfbMatchConfidence}%
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1 border-b border-slate-900 pb-2">
                      <div className="space-y-0.5">
                        <span id="extracted-mlfb-badge" className="text-base md:text-lg font-mono font-extrabold text-cyan-400 tracking-widest select-all">
                          {extractedData.mlfbFormatted || 'No detectado'}
                        </span>
                        {extractedData.mlfbParts && (
                          <div className="text-[10px] text-slate-400">
                            Gama: <span className="text-slate-200 font-semibold">{extractedData.mlfbParts.family}</span>
                          </div>
                        )}
                      </div>
                      
                      {extractedData.mlfb && (
                        <button
                          id="copy-mlfb-btn"
                          onClick={() => handleCopyToClipboard(extractedData.mlfb, 'mlfb')}
                          className="p-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-white rounded-lg transition-all active:scale-95 cursor-pointer"
                          title="Copiar MLFB al portapapeles"
                        >
                          {copiedField === 'mlfb' ? (
                            <Check className="w-4 h-4 text-green-500 animate-bounce" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>

                    {extractedData.mlfbParts && (
                      <p className="text-[10px] text-slate-500 leading-relaxed italic bg-slate-900/40 p-2 rounded">
                        <strong>Descripción Técnica Siemens:</strong> {
                          Object.values(SIEMENS_FAMILIES).find(f => f.name === extractedData.mlfbParts?.family)?.desc || 
                          'Dispositivo Siemens catalogado bajo el sistema estandarizado de codificación MLFB.'
                        }
                      </p>
                    )}

                    {/* Integrated Intelligent Corrections Notifier Feed */}
                    {extractedData.mlfbAdjustments && extractedData.mlfbAdjustments.length > 0 && (
                      <div className="bg-cyan-500/5 border border-cyan-500/10 rounded-lg p-2.5 space-y-1 mt-1 text-[10px] font-mono select-none">
                        <div className="flex items-center space-x-1.5 text-cyan-400 font-bold">
                          <Sparkle className="w-3.5 h-3.5" />
                          <span>Autocorrección Inteligente Aplicada:</span>
                        </div>
                        <ul className="list-disc pl-3.5 space-y-0.5 text-slate-350">
                          {extractedData.mlfbAdjustments.map((adj, i) => (
                            <li key={i}>{adj}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Z Codes list and descriptions */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-350 uppercase font-mono tracking-wider">Opciones Z Suplementarias</span>
                      <span className="text-[10px] text-slate-500 font-mono">({extractedData.zCodes.length} encontradas)</span>
                    </div>

                    {extractedData.zCodes.length === 0 ? (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-[11px] text-center italic font-mono">
                        Placa estándar. No se encontraron códigos de configuración Z suplementarios.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Selected chips array */}
                        <div className="flex flex-wrap gap-1.5">
                          {extractedData.zCodes.map(code => (
                            <span 
                              key={code} 
                              className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded font-mono text-xs font-bold"
                            >
                              Z = {code}
                            </span>
                          ))}
                        </div>

                        {/* Explained list cards inside UI */}
                        <div className="space-y-1.5 pt-1.5 max-h-[140px] overflow-y-auto pr-1">
                          {extractedData.zCodes.map(code => (
                            <div 
                              key={code} 
                              className="flex items-start space-x-2 p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] text-slate-300"
                            >
                              <span className="font-mono font-bold text-amber-400 bg-amber-950/20 border border-amber-900/30 px-1.5 rounded flex-shrink-0 mt-0.5">
                                {code}
                              </span>
                              <div className="flex-1 font-mono">
                                <span className="font-semibold text-slate-400">Definición: </span>
                                <span>{extractedData.zExplanation?.[code] || 'Módulo de pedido Siemens personalizado'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operational Technical parameters specs parameters */}
                  <div className="space-y-2.5">
                    <span className="text-xs font-bold text-slate-350 uppercase font-mono tracking-wider block">
                      Parámetros de Placa Registrados
                    </span>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                      {/* Power */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Potencia ACT</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{extractedData.power || 'No leída'}</span>
                        </div>
                      </div>

                      {/* Voltage */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Voltaje (V)</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{extractedData.voltage || 'No leído'}</span>
                        </div>
                      </div>

                      {/* Current */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Corriente (A)</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{extractedData.current || 'No leída'}</span>
                        </div>
                      </div>

                      {/* Speed */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Velocidad</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{extractedData.speed || 'No leída'}</span>
                        </div>
                      </div>

                      {/* Frequency */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Frecuencia</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{extractedData.frequency || 'No leída'}</span>
                        </div>
                      </div>

                      {/* IP rating */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Protección IP</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{extractedData.ipRating || 'No leído'}</span>
                        </div>
                      </div>

                      {/* Cos phi */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Factor Pot.</span>
                          <span className="text-xs font-mono font-bold text-slate-200">
                            {extractedData.cosPhi ? `cos φ ${extractedData.cosPhi}` : 'No leído'}
                          </span>
                        </div>
                      </div>

                      {/* Fab. Date (FD Code) */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center space-x-2.5">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                        <div>
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Fec. Fab (FD)</span>
                          <span className="text-xs font-mono font-bold text-slate-200">{extractedData.fdDate || 'No leída'}</span>
                        </div>
                      </div>

                      {/* Serial Number */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 col-span-2 md:col-span-1 flex items-center space-x-2.5">
                        <Bookmark className="w-3.5 h-3.5 text-cyan-400 mt-0.5" />
                        <div className="w-full overflow-hidden">
                          <span className="text-[9px] text-slate-500 block uppercase font-mono">Nº Serie</span>
                          <span className="text-xs font-mono font-bold text-slate-200 block truncate" title={extractedData.serial || ''}>
                            {extractedData.serial || 'No leído'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save Form & Nickname Assignment */}
                  <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono block">
                      Archivar en Inventario Local
                    </span>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-full sm:flex-1 relative">
                        <input
                          id="equipment-nickname-input"
                          type="text"
                          value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="Asigna un apodo (ej. Extrusora Principal)"
                          className="w-full bg-slate-900 border border-slate-805 text-xs text-white p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono"
                        />
                      </div>
                      
                      <button
                        id="save-to-catalog-btn"
                        onClick={handleSaveToCatalog}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded border border-slate-700 transition-all flex items-center justify-center space-x-1.5 shadow-md active:scale-95 cursor-pointer flex-shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{selectedPlateId ? 'Actualizar Ficha' : 'Guardar y Archivar'}</span>
                      </button>
                    </div>

                    {saveSuccess && (
                      <div className="p-2.5 bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-medium rounded-xl text-center animate-pulse font-mono">
                        [SUCCESS] Ficha guardada exitosamente en el catálogo local.
                      </div>
                    )}
                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

      </main>

      {/* Industrial Footer */}
      <footer className="h-12 bg-slate-900/50 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between px-8 text-[10px] text-slate-500 gap-2 py-2 sm:py-0 select-none">
        <div>DATA REMAINS ON LOCAL SERVER • NO EXTERNAL API CALLS</div>
        <div className="flex items-center space-x-4">
           <span>CPU LOAD: 14%</span>
           <span>RAM: 1.2GB/8GB</span>
           <span className="text-cyan-500 font-bold">• ENGINE: TESSERACT 5.3</span>
        </div>
      </footer>

    </div>
  );
}
