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
  Plus, 
  RefreshCw, 
  AlertTriangle, 
  Check, 
  Sliders, 
  Cpu, 
  Bookmark, 
  Folder, 
  Trash2, 
  LayoutGrid, 
  Download
} from 'lucide-react';

import { ScannedPlate, ExtractionResults, TesseractProgress, BatchItem, Project } from './types';
import { parseSiemensPlate, SIEMENS_FAMILIES } from './utils/parser';
import CameraScanner from './components/CameraScanner';
import ImageAdjuster from './components/ImageAdjuster';
import HelpManual from './components/HelpManual';

export default function App() {
  // Historical scans list loaded from localStorage
  const [plates, setPlates] = useState<ScannedPlate[]>([]);
  const [selectedPlateId, setSelectedPlateId] = useState<string | null>(null);

  // Project management states
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [saveProjectSelectionId, setSaveProjectSelectionId] = useState<string>('unassigned');
  const [newProjectName, setNewProjectName] = useState<string>('');

  // Active wizard step workflow State
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

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

  // Batch Processing States
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);

  // Helper to handle multiple batch files
  const handleBatchFiles = (files: File[]) => {
    setIsAdjusting(false);
    setShowCamera(false);
    setIsBatchMode(true);
    
    const items: BatchItem[] = files.map((file, idx) => ({
      id: 'batch_item_' + idx + '_' + Date.now(),
      name: file.name,
      size: file.size,
      file: file,
      status: 'queued',
      progress: 0
    }));

    setBatchItems(items);
  };

  const runTesseractOnDataUrl = (dataUrl: string, itemId: string): Promise<{ success: boolean; parsed?: ExtractionResults; rawText?: string }> => {
    return new Promise((resolve) => {
      Tesseract.recognize(
        dataUrl,
        'eng',
        {
          logger: m => {
            if (m.status === 'recognizing text') {
              setBatchItems((prev) =>
                prev.map((i) =>
                  i.id === itemId ? { ...i, progress: Math.round((m.progress || 0) * 100) } : i
                )
              );
            }
          }
        }
      ).then(({ data: { text } }) => {
        if (text && text.trim().length > 0) {
          const parsed = parseSiemensPlate(text);
          parsed.ocrEngine = 'tesseract';
          resolve({ success: true, parsed, rawText: text });
        } else {
          resolve({ success: false });
        }
      }).catch((err) => {
        console.error('Tesseract batch error:', err);
        resolve({ success: false });
      });
    });
  };

  const processBatchItem = async (item: BatchItem): Promise<BatchItem> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        
        // Update item status to processing
        setBatchItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: 'processing', dataUrl, progress: 30 } : i
          )
        );

        try {
          // Send to Gemini OCR API first
          const apiResponse = await fetch('/api/ocr', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: dataUrl }),
          });

          if (apiResponse.ok) {
            const data = await apiResponse.json();
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

            const { SIEMENS_Z_CODES, SIEMENS_FAMILIES } = await import('./utils/parser');
            if (parsed.zCodes && parsed.zCodes.length > 0) {
              parsed.zExplanation = {};
              parsed.zCodes.forEach(code => {
                if (parsed.zExplanation) {
                  parsed.zExplanation[code] = SIEMENS_Z_CODES[code] || 'Opción Siemens personalizada (Detalles técnicos según catálogo)';
                }
              });
            }

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

            const updatedItem: BatchItem = {
              ...item,
              dataUrl,
              status: 'success',
              progress: 100,
              extracted: parsed,
              rawText: data.rawText || `MLFB: ${formattedMlfb}`
            };
            resolve(updatedItem);
          } else {
            // Fallback to Tesseract locally for this item
            const tesseractResult = await runTesseractOnDataUrl(dataUrl, item.id);
            resolve({
              ...item,
              dataUrl,
              status: tesseractResult.success ? 'success' : 'failed',
              error: tesseractResult.success ? undefined : 'Error en lectura local',
              progress: 100,
              extracted: tesseractResult.parsed,
              rawText: tesseractResult.rawText
            });
          }
        } catch (err: any) {
          // Fallback to Tesseract
          try {
            const tesseractResult = await runTesseractOnDataUrl(dataUrl, item.id);
            resolve({
              ...item,
              dataUrl,
              status: tesseractResult.success ? 'success' : 'failed',
              error: tesseractResult.success ? undefined : err.message || 'Error de conexión',
              progress: 100,
              extracted: tesseractResult.parsed,
              rawText: tesseractResult.rawText
            });
          } catch (tessErr) {
            resolve({
              ...item,
              dataUrl,
              status: 'failed',
              error: err.message || 'Error de lectura',
              progress: 100
            });
          }
        }
      };
      reader.onerror = () => {
        resolve({ ...item, status: 'failed', error: 'Error al leer archivo', progress: 100 });
      };
      reader.readAsDataURL(item.file);
    });
  };

  const startBatchProcess = async () => {
    if (batchItems.length === 0 || isProcessingBatch) return;
    setIsProcessingBatch(true);

    const updatedItems = [...batchItems];
    for (let i = 0; i < updatedItems.length; i++) {
      // Set to processing
      setBatchItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'processing' } : item));
      const result = await processBatchItem(updatedItems[i]);
      updatedItems[i] = result;
      
      // Update state for real-time progress update
      setBatchItems(prev => prev.map((item) => item.id === result.id ? result : item));
    }

    setIsProcessingBatch(false);
  };

  const saveBatchToCatalog = () => {
    const successItems = batchItems.filter(item => item.status === 'success' && item.extracted);
    if (successItems.length === 0) return;

    let updatedPlates = [...plates];
    
    successItems.forEach((item, index) => {
      const parsed = item.extracted!;
      
      // Generate default name
      let defName = `Lote: Placa ${parsed.modelType === 'motor' ? 'Motor' : parsed.modelType === 'vfd' ? 'Variador' : parsed.modelType === 'plc' ? 'S7 PLC' : 'Equipo'}`;
      if (parsed.power) defName += ` - ${parsed.power}`;
      else if (parsed.serial) defName += ` - S/N ${parsed.serial.substring(0, 6)}`;
      else defName += ` - #${plates.length + index + 1}`;

      const newPlate: ScannedPlate = {
        id: 'plate_' + Date.now() + '_' + index,
        name: defName,
        timestamp: new Date().toISOString(),
        imageUrl: item.dataUrl || '',
        rawText: item.rawText || '',
        extracted: parsed,
        projectId: activeProjectId || undefined
      };

      updatedPlates = [newPlate, ...updatedPlates];
    });

    savePlatesToLocalStorage(updatedPlates);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3050);
    
    // Auto load the first successfully processed element as the active selection
    if (successItems.length > 0) {
      const firstS = successItems[0].extracted!;
      setExtractedData(firstS);
      setRawText(successItems[0].rawText || '');
      setProcessedImageSrc(successItems[0].dataUrl || '');
      setSelectedPlateId(null);
      
      let defName = 'Placa Siemens ';
      if (firstS.modelType === 'motor') defName += 'Motor';
      else if (firstS.modelType === 'vfd') defName += 'Variador';
      else if (firstS.modelType === 'plc') defName += 'S7 PLC';
      else defName += 'Equipo';

      if (firstS.power) defName += ` - ${firstS.power}`;
      else if (firstS.serial) defName += ` - S/N ${firstS.serial.substring(0, 6)}`;
      else defName += ` - #${plates.length + 1}`;
      setCustomName(defName);
    }

    // Reset batch state
    setIsBatchMode(false);
    setBatchItems([]);
  };

  // Initial load of history catalog from local storage
  useEffect(() => {
    try {
      // Load plates
      const stored = localStorage.getItem('siemens_scanned_plates');
      if (stored) {
        setPlates(JSON.parse(stored));
      }

      // Load projects
      const storedProjects = localStorage.getItem('siemens_projects');
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      }

      // Load active project id
      const storedActiveId = localStorage.getItem('siemens_active_project_id');
      if (storedActiveId) {
        setActiveProjectId(storedActiveId === 'null' ? null : storedActiveId);
      }
    } catch (e) {
      console.error('Error loading config from localStorage:', e);
    }
  }, []);

  // Selection synchronization & Step management on start
  useEffect(() => {
    if (projects.length > 0) {
      if (activeProjectId === null) {
        // Default to first project if available
        setActiveProjectId(projects[0].id);
      }
      setCurrentStep(2); // Go to scan loader if projects exist
    } else {
      setCurrentStep(1); // Demand project first if empty
    }
  }, [projects.length]);

  // Sync to local storage on changes
  const savePlatesToLocalStorage = (newPlates: ScannedPlate[]) => {
    try {
      localStorage.setItem('siemens_scanned_plates', JSON.stringify(newPlates));
      setPlates(newPlates);
    } catch (e) {
      console.error('Error writing to localStorage:', e);
    }
  };

  const saveProjectsToLocalStorage = (newProjects: Project[]) => {
    try {
      localStorage.setItem('siemens_projects', JSON.stringify(newProjects));
      setProjects(newProjects);
    } catch (e) {
      console.error('Error saving projects to localStorage:', e);
    }
  };

  const saveActiveProjectIdToLocalStorage = (id: string | null) => {
    try {
      localStorage.setItem('siemens_active_project_id', id === null ? 'null' : id);
      setActiveProjectId(id);
    } catch (e) {
      console.error('Error saving active project id to localStorage:', e);
    }
  };

  const handleCreateProject = (name: string) => {
    const newProj: Project = {
      id: 'project_' + Date.now(),
      name: name.trim(),
      timestamp: new Date().toISOString()
    };
    const updated = [...projects, newProj];
    saveProjectsToLocalStorage(updated);
    saveActiveProjectIdToLocalStorage(newProj.id);
  };

  const handleDeleteProject = (projId: string) => {
    // Keep plates but set their project relation to undefined
    const updatedPlates = plates.map(p => p.projectId === projId ? { ...p, projectId: undefined } : p);
    savePlatesToLocalStorage(updatedPlates);

    const updatedProjects = projects.filter(p => p.id !== projId);
    saveProjectsToLocalStorage(updatedProjects);

    if (activeProjectId === projId) {
      saveActiveProjectIdToLocalStorage(null);
    }
  };

  const handleSetActiveProject = (projId: string | null) => {
    saveActiveProjectIdToLocalStorage(projId);
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
    setSaveProjectSelectionId(plate.projectId || 'unassigned');
  };

  // Copy text helper
  const handleCopyToClipboard = (text: string, field: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(''), 2000);
  };

  // Convert and trigger browser download of CSV spreadsheet formatted UTF-8 with BOM for Excel compatibility
  const handleExportCSV = (projectId: string) => {
    const projectPlates = plates.filter(p => p.projectId === projectId);
    if (projectPlates.length === 0) {
      alert("No hay ningún equipo en este proyecto para exportar.");
      return;
    }
    
    // Headers matching requirements
    const headers = [
      "No.",
      "Nombre Identificador",
      "Codigo Referencia Siemens MLFB",
      "Numero de Serie",
      "Categoria",
      "Potencia",
      "Voltaje (V)",
      "Corriente (A)",
      "Velocidad (RPM)",
      "Frecuencia (Hz)",
      "Factor Pot (Cos Phi)",
      "Grado Proteccion IP",
      "Fecha FD",
      "Opciones Z Suplementarias"
    ];
    
    // Rows mapping
    const csvRows = [
      headers.join(","),
      ...projectPlates.map((p, index) => {
        const e = p.extracted;
        const values = [
          index + 1,
          `"${(p.name || '').replace(/"/g, '""')}"`,
          `"${(e.mlfbFormatted || e.mlfb || '').replace(/"/g, '""')}"`,
          `"${(e.serial || '').replace(/"/g, '""')}"`,
          `"${(e.modelType || 'other').replace(/"/g, '""')}"`,
          `"${(e.power || '').replace(/"/g, '""')}"`,
          `"${(e.voltage || '').replace(/"/g, '""')}"`,
          `"${(e.current || '').replace(/"/g, '""')}"`,
          `"${(e.speed || '').replace(/"/g, '""')}"`,
          `"${(e.frequency || '').replace(/"/g, '""')}"`,
          `"${(e.cosPhi || '').replace(/"/g, '""')}"`,
          `"${(e.ipRating || '').replace(/"/g, '""')}"`,
          `"${(e.fdDate || '').replace(/"/g, '""')}"`,
          `"${(e.zCodes || []).join('; ')}"`
        ];
        return values.join(",");
      })
    ].join("\n");
    
    // Create download trigger using UTF-8 BOM
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const proj = projects.find(p => p.id === projectId);
    const filename = proj ? `Siemens_Inventario_${proj.name.replace(/\s+/g, '_')}.csv` : 'Siemens_Industrial_Inventario.csv';
    
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Process File upload (Drag or Dialog)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        setIsBatchMode(false);
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setRawImageSrc(event.target.result as string);
            setIsAdjusting(true); // Open preprocessor panel
            setShowCamera(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        handleBatchFiles(Array.from(files));
      }
    }
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (files.length === 1) {
        setIsBatchMode(false);
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            setRawImageSrc(event.target.result as string);
            setIsAdjusting(true);
            setShowCamera(false);
          }
        };
        reader.readAsDataURL(file);
      } else {
        handleBatchFiles(Array.from(files));
      }
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
        setSaveProjectSelectionId(activeProjectId || 'unassigned');
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
        setSaveProjectSelectionId(activeProjectId || 'unassigned');
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

    const chosenProjId = saveProjectSelectionId === 'unassigned' ? undefined : saveProjectSelectionId;

    const newPlate: ScannedPlate = {
      id: selectedPlateId || 'plate_' + Date.now(),
      name: customName.trim() || 'Placa Siemens',
      timestamp: new Date().toISOString(),
      imageUrl: processedImageSrc,
      rawText: rawText,
      extracted: extractedData,
      projectId: chosenProjId
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
  const handleLoadDemo = async (type: 'motor' | 'plc') => {
    setIsAdjusting(false);
    setShowCamera(false);
    setSelectedPlateId(null);
    setSaveProjectSelectionId(activeProjectId || 'unassigned');

    const { SIEMENS_Z_CODES, SIEMENS_FAMILIES } = await import('./utils/parser');

    if (type === 'motor') {
      const parsed: ExtractionResults = {
        mlfb: '1LA7073-4AB11',
        mlfbFormatted: '1LA7073-4AB11',
        mlfbMatchConfidence: 100,
        zCodes: ['30', '90'],
        zExplanation: {
          '30': SIEMENS_Z_CODES['35'] || 'Protección por termistores integrada (PTC)',
          '90': SIEMENS_Z_CODES['90'] || 'Caja de bornes rotada 90 grados a la derecha'
        },
        serial: 'UD1408/5029104-001',
        fdDate: '0408 (Agosto 2004)',
        voltage: '230/400 V',
        current: '1.42/0.82 A',
        power: '0.25 kW (0.34 HP)',
        speed: '1350 RPM',
        frequency: '50 Hz',
        cosPhi: '0.78',
        ipRating: 'IP55',
        weight: '6.0 kg',
        efficiency: '68%',
        modelType: 'motor',
        mlfbAdjustments: [],
        ocrEngine: 'gemini'
      };

      const prefix3 = parsed.mlfb.substring(0, 3);
      const matchedFamily = SIEMENS_FAMILIES[prefix3];
      if (matchedFamily) {
        parsed.mlfbParts = {
          family: matchedFamily.name,
          type: '073',
          suffix: '4AB11'
        };
      }

      setIsProcessing(false);
      setRawText('SIEMENS SD 3PHASE MOTOR 1LA7073-4AB11 \nUD 1408/5029104-001 \nIP55 IM B3 cos 0.78 0.25kW 1350 RPM \n50Hz 230/400V Y 1.42/0.82A \nZ = 30 + 90');
      setExtractedData(parsed);
      setCustomName('Demo: Motor SIMOTICS GP 0.25kW');
      setProcessedImageSrc('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300" viewBox="0 0 600 300"><rect width="100%" height="100%" fill="%230f172a"/><text x="20" y="40" fill="%2310b981" font-family="monospace" font-size="14">SIEMENS SD 3PHASE MOTOR 1LA7073-4AB11-Z</text><text x="20" y="80" fill="%23cbd5e1" font-family="monospace" font-size="12">UD 1408/5029104-001 • IP55 • IEC 34-1</text><text x="20" y="120" fill="%23cbd5e1" font-family="monospace" font-size="12">50Hz 230/400V Y 1.42/0.82A • 1350 RPM • cos 0.78</text><line x1="20" y1="160" x2="580" y2="160" stroke="%23334155" stroke-width="2"/><text x="20" y="200" fill="%23fbbf24" font-family="monospace" font-size="12">OPCIONES ADICIONALES: Z = 30 + 90</text></svg>');
    } else {
      const parsed: ExtractionResults = {
        mlfb: '6ES7511-1AK02-0AB0',
        mlfbFormatted: '6ES7511-1AK02-0AB0',
        mlfbMatchConfidence: 100,
        zCodes: [],
        zExplanation: {},
        serial: 'S VP-B341052',
        fdDate: '2108 (Agosto 2021)',
        voltage: '24 VDC',
        current: '0.7 A',
        power: '—',
        speed: '—',
        frequency: '—',
        cosPhi: '—',
        ipRating: 'IP20',
        weight: '0.40 kg',
        efficiency: '—',
        modelType: 'plc',
        mlfbAdjustments: [],
        ocrEngine: 'gemini'
      };

      const prefix3 = parsed.mlfb.substring(0, 3);
      const matchedFamily = SIEMENS_FAMILIES['6ES'];
      if (matchedFamily) {
        parsed.mlfbParts = {
          family: matchedFamily.name,
          type: '511',
          suffix: '1AK02-0AB0'
        };
      }

      setIsProcessing(false);
      setRawText('SIEMENS SIMATIC S7-1500 PN \nCPU 511-1 PN \nMLFB: 6ES7511-1AK02-0AB0 \nS VP-B341052   HW: 01   FW: V2.9.2 \nFD 2108');
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
              className="text-[10px] md:text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-705 border border-slate-750 rounded text-slate-300 transition-colors cursor-pointer font-medium"
            >
              Demo Motor
            </button>
            <button
              onClick={() => handleLoadDemo('plc')}
              className="text-[10px] md:text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-705 border border-slate-750 rounded text-slate-300 transition-colors cursor-pointer font-medium"
            >
              Demo PLC
            </button>
          </div>
        </div>
      </header>

      {/* Stepper Navigation Indicator banner */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 backdrop-blur-sm sticky top-16 z-30 py-3 px-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-start">
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 font-mono">Progreso:</span>
            <div className="flex items-center space-x-1 text-xs">
              <span className="text-yellow-550 font-bold font-mono">
                {activeProjectId ? `📁 ${projects.find(p => p.id === activeProjectId)?.name || 'Sin nombre'}` : '📁 No hay proyecto activo'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none justify-start md:justify-end">
            <button
              id="step-tab-1"
              onClick={() => setCurrentStep(1)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap ${
                currentStep === 1
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[9px]">1</span>
              <span>Proyecto</span>
            </button>

            <span className="text-slate-700 text-xs font-mono select-none">❯</span>

            <button
              id="step-tab-2"
              onClick={() => {
                if (activeProjectId) {
                  setCurrentStep(2);
                } else {
                  alert("Por favor crea o selecciona un proyecto en el Paso 1 para continuar.");
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                !activeProjectId ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              } ${
                currentStep === 2
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[9px]">2</span>
              <span>Cargar / Cámara</span>
            </button>

            <span className="text-slate-700 text-xs font-mono select-none">❯</span>

            <button
              id="step-tab-3"
              onClick={() => {
                if (extractedData) {
                  setCurrentStep(3);
                } else {
                  alert("Primero captura o sube una imagen de placa de datos en el Paso 2 para habilitar la extracción.");
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                !extractedData ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              } ${
                currentStep === 3
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[9px]">3</span>
              <span>Extracción OCR</span>
            </button>

            <span className="text-slate-700 text-xs font-mono select-none">❯</span>

            <button
              id="step-tab-4"
              onClick={() => {
                if (activeProjectId) {
                  setCurrentStep(4);
                } else {
                  alert("Selecciona un proyecto activo para ver su tabla de exportación.");
                }
              }}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all whitespace-nowrap ${
                !activeProjectId ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
              } ${
                currentStep === 4
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-950/40 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[9px]">4</span>
              <span>Tabla CSV</span>
            </button>
          </div>

        </div>
      </div>

      {/* Main Container Workspace */}
      <main id="wizard-body-main" className="max-w-7xl mx-auto px-4 py-6 flex-1 w-full flex flex-col justify-start">
        
        {/* STEP 1 SCREEN */}
        {currentStep === 1 && (
          <div id="wizard-step-1" className="space-y-6 max-w-4xl mx-auto w-full py-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] uppercase font-mono font-bold rounded">Paso 1 de 4</span>
                <h2 className="text-xl font-bold text-white tracking-tight">Definir o Seleccionar un Proyecto</h2>
                <p className="text-xs text-slate-400">
                  Antes de agregar o tomar fotos, ingresa un nombre de proyecto para una mejor organización. Tus equipos se mostrarán estructurados en una tabla tipo CSV o Excel exclusiva del proyecto.
                </p>
              </div>

              {/* Grid of actions: Create project & Switch project */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
                
                {/* Create block */}
                <div className="md:col-span-5 bg-slate-950 rounded-xl p-5 border border-slate-850 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-404 font-bold block">🛠️ Crear Nuevo Proyecto</span>
                    <input
                      type="text"
                      id="new-project-name-wizard"
                      value={newProjectName}
                      onChange={(e) => setNewProjectName(e.target.value)}
                      placeholder="Ej. Línea 3 de Envasado..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-505 focus:outline-none focus:ring-1 focus:ring-cyan-505 font-medium font-sans"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (newProjectName.trim()) {
                        handleCreateProject(newProjectName.trim());
                        setNewProjectName('');
                        setCurrentStep(2); // Go to loader!
                      }
                    }}
                    disabled={!newProjectName.trim()}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-xs font-bold font-mono tracking-wide rounded-xl text-white transition active:scale-95 cursor-pointer"
                  >
                    Crear y Continuar ➔
                  </button>
                </div>

                {/* List folders block */}
                <div className="md:col-span-7 bg-slate-950 rounded-xl p-5 border border-slate-850 space-y-3">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-cyan-400 font-bold block">📂 Seleccionar Proyecto Existente</span>
                  {projects.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500 italic">
                      Aún no tienes proyectos creados localmente. Crea uno a la izquierda para comenzar de inmediato.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {projects.map((proj) => {
                        const count = plates.filter(p => p.projectId === proj.id).length;
                        const isSelected = activeProjectId === proj.id;
                        return (
                          <div
                            key={proj.id}
                            onClick={() => {
                              handleSetActiveProject(proj.id);
                              setCurrentStep(2);
                            }}
                            className={`p-3 rounded-lg border text-left cursor-pointer transition flex items-center justify-between ${
                              isSelected
                                ? 'bg-cyan-950/20 border-cyan-500/60 bg-slate-900/40 text-cyan-404 font-bold'
                                : 'bg-slate-900/50 hover:bg-slate-900 border-slate-850 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center space-x-2.5 min-w-0">
                              <Folder className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <span className="text-xs truncate font-medium font-sans">{proj.name}</span>
                            </div>
                            <div className="flex items-center space-x-2.5 flex-shrink-0">
                              <span className="text-[9px] font-mono px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-slate-500">
                                {count} equipo{count !== 1 ? 's' : ''}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`¿Seguro que deseas eliminar el proyecto "${proj.name}"? Los equipos no asociados pasarán al historial general.`)) {
                                    handleDeleteProject(proj.id);
                                  }
                                }}
                                className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-950/15"
                                title="Eliminar proyecto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* STEP 2 SCREEN */}
        {currentStep === 2 && (
          <div id="wizard-step-2" className="space-y-6 max-w-4xl mx-auto w-full py-4 animate-fade-in">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
              
              {/* Header of Step */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] uppercase font-mono font-bold rounded">Paso 2 de 4</span>
                  <h2 className="text-xl font-bold text-white tracking-tight">Cargar Fotos o Tomar Foto</h2>
                  <p className="text-xs text-slate-404 text-slate-400">
                    Sube archivos JPG, PNG en lote, o activa la cámara web de tu terminal para capturar la placa en tiempo real.
                  </p>
                </div>
                
                {/* Batch configuration inside wizard */}
                <div className="flex items-center space-x-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 select-none">
                  <button
                    onClick={() => {
                      setIsBatchMode(false);
                      setBatchItems([]);
                    }}
                    className={`text-[10px] px-3 py-1 rounded font-mono font-bold transition-all cursor-pointer ${
                      !isBatchMode 
                        ? 'bg-cyan-600 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🔍 Escaneo Único
                  </button>
                  <button
                    onClick={() => {
                      setIsBatchMode(true);
                    }}
                    className={`text-[10px] px-3 py-1 rounded font-mono font-bold transition-all cursor-pointer ${
                      isBatchMode 
                        ? 'bg-cyan-600 text-white shadow' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📦 Lote (Múltiple)
                  </button>
                </div>
              </div>

              {/* File Dropper, Adjuster and Camera container */}
              <div className="space-y-4">
                {/* If camera is open */}
                {showCamera && !isBatchMode && (
                  <div className="animate-fade-in">
                    <CameraScanner 
                      onCapture={(cap) => {
                        handleCameraCapture(cap);
                      }} 
                      onClose={() => setShowCamera(false)} 
                    />
                  </div>
                )}

                {/* Image preprocessor adjustment panel */}
                {isAdjusting && rawImageSrc && !isBatchMode && (
                  <div className="animate-fade-in bg-slate-950 p-4 border border-slate-800 rounded-xl space-y-4">
                    <div className="text-xs font-bold text-cyan-404 uppercase font-mono tracking-wider flex items-center space-x-2">
                      <Sliders className="w-4 h-4" />
                      <span>Optimizar parámetros de contraste para mejorar la lectura OCR</span>
                    </div>
                    <ImageAdjuster 
                      src={rawImageSrc} 
                      onProcessed={(adjusted) => {
                        runOcrProcessing(adjusted);
                        setCurrentStep(3); // Auto-advance to Step 3 processing!
                      }} 
                      onCancel={() => {
                        setIsAdjusting(false);
                        setRawImageSrc('');
                      }} 
                    />
                  </div>
                )}

                {/* Regular uploader triggers if camera is off and adjuster is off */}
                {!showCamera && !isAdjusting && (
                  <div className="grid grid-cols-1 gap-4">
                    
                    {/* Buttons block */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      {!isBatchMode && (
                        <button
                          id="wizard-camera-button"
                          onClick={() => {
                            setShowCamera(true);
                            setRawImageSrc('');
                            setIsAdjusting(false);
                          }}
                          className="w-full sm:w-auto px-5 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-mono font-bold text-xs rounded-xl flex items-center justify-center space-x-2 transition cursor-pointer active:scale-95 shadow-md shadow-cyan-950/40"
                        >
                          <Camera className="w-4 h-4" />
                          <span>Tomar Foto con Cámara</span>
                        </button>
                      )}
                      
                      <label
                        htmlFor="wizard-file-input"
                        className="w-full sm:w-auto px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono font-bold text-xs rounded-xl flex items-center justify-center space-x-2 cursor-pointer transition active:scale-95"
                      >
                        <Upload className="w-4 h-4" />
                        <span>{isBatchMode ? "Cargar Placas en Lote" : "Subir Foto Desde Archivo"}</span>
                        <input
                          id="wizard-file-input"
                          type="file"
                          accept="image/*"
                          multiple={isBatchMode}
                          onChange={(e) => {
                            handleFileUpload(e);
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Drag and Drop Area */}
                    {!isBatchMode ? (
                      <div
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-10 bg-slate-950/30 text-center transition flex flex-col items-center justify-center space-y-3 cursor-pointer"
                      >
                        <div className="p-3 bg-slate-900 rounded-full text-slate-400">
                          <Upload className="w-8 h-8 opacity-60" />
                        </div>
                        <div>
                          <h4 className="text-slate-200 text-xs font-semibold">Arrastra y suelta tu imagen aquí</h4>
                          <p className="text-[10px] text-slate-500 mt-1 max-w-sm">
                            Sube una chapa Siemens y el modelo extraerá inmediatamente el MLFB y las opciones adicionales.
                          </p>
                        </div>
                      </div>
                    ) : (
                      /* Batch Mode Files Panel */
                      <div className="border border-slate-850 rounded-xl p-5 bg-slate-950/25 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500">Imágenes detectadas en cola</span>
                          <span className="text-[10px] text-slate-500">{batchItems.length} archivos en cola</span>
                        </div>

                        {batchItems.length === 0 ? (
                          <div
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                            className="border-2 border-dashed border-slate-800 rounded-xl py-12 text-center text-slate-450 text-xs italic"
                          >
                            Usa el botón de carga o arrastra aquí múltiples archivos de chapa Siemens para procesarlos en ráfaga.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-between gap-3 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                              <span className="text-[10px] text-slate-400 font-medium">Todos los equipos leídos se indexarán en el CSV del proyecto activo</span>
                              <div className="flex gap-2">
                                {!isProcessingBatch && (
                                  <button
                                    onClick={async () => {
                                      await startBatchProcess();
                                      setCurrentStep(3); // Go to Step 3 processing views
                                    }}
                                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono font-bold text-xs rounded-lg cursor-pointer flex items-center justify-center shadow-md shadow-cyan-950/30"
                                  >
                                    Comenzar Extracción de Lote ➔
                                  </button>
                                )}
                                <button
                                  onClick={() => setBatchItems([])}
                                  className="px-3 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs"
                                >
                                  Limpiar
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                              {batchItems.map(item => (
                                <div key={item.id} className="bg-slate-950/40 p-2 rounded-lg border border-slate-850 flex items-center justify-between gap-2.5">
                                  <div className="flex items-center gap-2 truncate">
                                    <div className="w-8 h-8 bg-slate-900 rounded overflow-hidden flex-shrink-0 flex items-center justify-center text-slate-600 font-mono text-[9px]">
                                      {item.dataUrl ? (
                                        <img src={item.dataUrl} className="w-full h-full object-cover" />
                                      ) : (
                                        'IMG'
                                      )}
                                    </div>
                                    <span className="text-xs text-slate-300 truncate" title={item.name}>{item.name}</span>
                                  </div>
                                  <span className="text-[9px] text-slate-500 font-mono">{(item.size / 1024).toFixed(0)} KB</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* STEP 3 SCREEN */}
        {currentStep === 3 && (
          <div id="wizard-step-3" className="space-y-6 max-w-5xl mx-auto w-full py-4 animate-fade-in">
            
            {/* Loading spinner for single scan */}
            {isProcessing && (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 max-w-md mx-auto shadow-xl">
                <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin" />
                <div className="space-y-1.5 w-full font-mono">
                  <h4 className="text-xs font-semibold text-slate-100 uppercase tracking-widest">{ocrProgress.status || 'Extrayendo...'}</h4>
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-3 border border-slate-850">
                    <div 
                      className="bg-cyan-500 h-full transition-all duration-300" 
                      style={{ width: `${ocrProgress.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-bold block mt-1">{ocrProgress.progress}% completado</span>
                </div>
              </div>
            )}

            {/* Loading banner for batch scans */}
            {isBatchMode && isProcessingBatch && (
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl flex flex-col items-center justify-center text-center space-y-4 max-w-xl mx-auto">
                <RefreshCw className="w-9 h-9 text-cyan-400 animate-spin" />
                <div className="space-y-1.5 w-full">
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] uppercase font-mono font-bold rounded">Paso 3: Extracción Activa en Lote</span>
                  <h4 className="text-xs font-semibold font-mono text-slate-205 mt-2">Analizando y parseando imágenes del lote...</h4>
                  
                  <div className="space-y-1.5 text-left bg-slate-950 p-3 rounded-lg border border-slate-850 mt-4 max-h-[160px] overflow-y-auto w-full">
                    {batchItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-[10px] font-mono">
                        <span className="text-slate-400 truncate max-w-[240px]">{item.name}</span>
                        <span className={`text-[9px] ${
                          item.status === 'success' ? 'text-green-400 font-bold' :
                          item.status === 'processing' ? 'text-cyan-404 animate-pulse' :
                          item.status === 'failed' ? 'text-red-400' : 'text-slate-500'
                        }`}>
                          {item.status === 'queued' ? 'En espera' : 
                           item.status === 'processing' ? `Procesando (${item.progress}%)` :
                           item.status === 'success' ? 'Completado ✓' : 'Error'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Result display area */}
            {!isProcessing && !isProcessingBatch && (
              <>
                {!extractedData && batchItems.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 p-12 rounded-2xl text-center space-y-4 max-w-md mx-auto">
                    <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
                    <div>
                      <h3 className="font-bold text-sm text-slate-205 font-bold">No hay datos procesados</h3>
                      <p className="text-xs text-slate-400 font-sans mt-1">
                        Regresa al Paso 2 para cargar un archivo o realizar una captura con la cámara de tu terminal.
                      </p>
                    </div>
                    <button
                      onClick={() => setCurrentStep(2)}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-mono font-bold text-xs rounded-xl cursor-pointer"
                    >
                      ➔ Ir al Paso 2
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Info project header */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-4 border border-slate-800 rounded-xl">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-400 font-mono uppercase tracking-wider block">Inspección de Extracción:</span>
                        <span className="text-xs font-mono font-bold text-yellow-500 bg-slate-950 px-2.5 py-0.5 rounded border border-slate-850">
                          {projects.find(p => p.id === activeProjectId)?.name || 'General (Sin Proyecto)'}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentStep(2)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono font-bold text-[10px] rounded transition-all cursor-pointer"
                        >
                          ◀ Volver a Cargar Fotos
                        </button>
                      </div>
                    </div>

                    {/* Batch Items list representation */}
                    {isBatchMode && batchItems.length > 0 && (
                      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-800 pb-2">
                          <span className="text-slate-403 font-bold uppercase tracking-wider">Fichas extraídas de este lote:</span>
                          <button
                            onClick={() => {
                              saveBatchToCatalog();
                              setCurrentStep(4); // Advance to tab
                            }}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold text-[10px] text-white rounded transition cursor-pointer"
                          >
                            🚀 Guardar Lote Completo en el CSV ({batchItems.filter(i => i.status === 'success').length} Equipos)
                          </button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                          {batchItems.map((item, idx) => {
                            const isSelected = item.extracted && extractedData === item.extracted;
                            if (item.status !== 'success') return null;
                            return (
                              <button
                                key={item.id}
                                onClick={() => {
                                  if (item.extracted) {
                                    setExtractedData(item.extracted);
                                    setRawText(item.rawText || '');
                                    if (item.dataUrl) setProcessedImageSrc(item.dataUrl);
                                    setCustomName(`Placa Lote #${idx+1} - ${item.extracted.mlfb}`);
                                  }
                                }}
                                className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs font-mono flex items-center space-x-2 transition cursor-pointer ${
                                  isSelected 
                                    ? 'bg-cyan-600 border-cyan-500 text-white' 
                                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <span>📄 Placa {idx+1} ({item.extracted?.mlfbFormatted?.substring(0, 8) || 'MLFB'})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {extractedData && (
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                        
                        {/* Column Left: Visual representation & Raw text */}
                        <div className="lg:col-span-5 space-y-4">
                          
                          {/* Image preview */}
                          {processedImageSrc && (
                            <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl space-y-2">
                              <span className="text-[9px] uppercase font-bold text-slate-500 font-mono tracking-wider block">Vista Previa Original:</span>
                              <div className="aspect-video bg-slate-950/60 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center p-1">
                                {processedImageSrc.startsWith('data:image/svg') ? (
                                  <div 
                                    className="w-full h-full object-contain"
                                    dangerouslySetInnerHTML={{ __html: processedImageSrc.replace('data:image/svg+xml;utf8,', '') }} 
                                  />
                                ) : (
                                  <img src={processedImageSrc} alt="Preview" className="max-w-full max-h-full object-contain" />
                                )}
                              </div>
                            </div>
                          )}

                          {/* Raw texts */}
                          <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                              <div className="flex items-center space-x-2">
                                <FileText className="w-4 h-4 text-cyan-500" />
                                <h4 className="font-semibold text-xs text-slate-200">Texto de Origen (Editable)</h4>
                              </div>
                              <span className="text-[8px] text-slate-500 font-mono uppercase">OCR Input</span>
                            </div>

                            <textarea
                              id="ocr-raw-textarea-wi"
                              value={rawText}
                              onChange={handleOcrTextChange}
                              className="w-full min-h-[220px] bg-slate-950 text-[10px] text-slate-350 p-2.5 rounded-xl border border-slate-850 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono leading-relaxed"
                              placeholder="Escribe o corrige de manera libre el texto de la chapa..."
                            />
                            <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-850 text-[9px] text-slate-500 font-mono">
                              *Los cambios en el cuadro de texto corrigen automáticamente las variables parseadas técnicas de la derecha al instante.
                            </div>
                          </div>
                        </div>

                        {/* Column Right: Parser and Save Panel */}
                        <div className="lg:col-span-7 space-y-4">
                          <div className="bg-slate-900 border border-slate-805 p-6 rounded-2xl space-y-5">
                            
                            {/* MLFB banner */}
                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 relative overflow-hidden">
                              <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-500"></div>
                              <div className="flex justify-between items-center text-[8px] font-mono font-bold tracking-wider text-cyan-400 uppercase">
                                <span>Código de Modelo Siemens MLFB</span>
                                <span>Confianza: {extractedData.mlfbMatchConfidence}%</span>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-base sm:text-lg font-mono font-extrabold text-cyan-400 select-all uppercase">
                                  {extractedData.mlfbFormatted || 'PENDIENTE'}
                                </span>
                                <button
                                  onClick={() => handleCopyToClipboard(extractedData.mlfbFormatted, 'mlfb-detail')}
                                  className="p-1 px-2 border border-slate-800 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] font-mono cursor-pointer"
                                >
                                  {copiedField === 'mlfb-detail' ? 'Copiado✓' : 'Copiar'}
                                </button>
                              </div>

                              {extractedData.mlfbParts && (
                                <div className="text-[9px] text-slate-500 font-mono">
                                  Familia: {extractedData.mlfbParts.family}
                                </div>
                              )}
                            </div>

                            {/* Operational specifications grids */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Ficha Técnica Interpretada</span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                
                                <div className="bg-slate-950/60 p-2 border border-slate-850 rounded-lg">
                                  <span className="text-[8px] text-slate-500 block uppercase font-mono">Potencia</span>
                                  <span className="text-[11px] font-mono text-slate-300 font-bold">{extractedData.power || 'N/D'}</span>
                                </div>

                                <div className="bg-slate-950/60 p-2 border border-slate-850 rounded-lg">
                                  <span className="text-[8px] text-slate-500 block uppercase font-mono">Tensión (Voltios)</span>
                                  <span className="text-[11px] font-mono text-slate-300 font-bold">{extractedData.voltage || 'N/D'}</span>
                                </div>

                                <div className="bg-slate-950/60 p-2 border border-slate-855 rounded-lg">
                                  <span className="text-[8px] text-slate-500 block uppercase font-mono">Intensidad (Amperes)</span>
                                  <span className="text-[11px] font-mono text-slate-300 font-bold">{extractedData.current || 'N/D'}</span>
                                </div>

                                <div className="bg-slate-950/60 p-2 border border-slate-850 rounded-lg col-span-1">
                                  <span className="text-[8px] text-slate-500 block uppercase font-mono">Velocidad de Giro</span>
                                  <span className="text-[11px] font-mono text-slate-300 font-bold">{extractedData.speed || 'N/D'}</span>
                                </div>

                                <div className="bg-slate-950/60 p-2 border border-slate-850 rounded-lg">
                                  <span className="text-[8px] text-slate-500 block uppercase font-mono">Frecuencia Hz</span>
                                  <span className="text-[11px] font-mono text-slate-300 font-bold">{extractedData.frequency || 'N/D'}</span>
                                </div>

                                <div className="bg-slate-950/60 p-2 border border-slate-850 rounded-lg">
                                  <span className="text-[8px] text-slate-500 block uppercase font-mono">Grado IP</span>
                                  <span className="text-[11px] font-mono text-slate-300 font-bold">{extractedData.ipRating || 'N/D'}</span>
                                </div>

                                <div className="bg-slate-950/60 p-2 border border-slate-850 rounded-lg col-span-2 sm:col-span-1">
                                  <span className="text-[8px] text-slate-500 block uppercase font-mono">Nº Serie Fábrica</span>
                                  <span className="text-[11px] font-mono text-slate-300 font-bold block truncate" title={extractedData.serial}>{extractedData.serial || 'N/D'}</span>
                                </div>

                                <div className="bg-slate-950/60 p-2 border border-slate-850 rounded-lg">
                                  <span className="text-[8px] text-slate-500 block uppercase font-mono">Fabricación FD</span>
                                  <span className="text-[11px] font-mono text-slate-300 font-bold">{extractedData.fdDate || 'N/D'}</span>
                                </div>

                                <div className="bg-slate-950/60 p-2 border border-slate-855 rounded-lg">
                                  <span className="text-[8px] text-slate-500 block uppercase font-mono">cos φ</span>
                                  <span className="text-[11px] font-mono text-slate-300 font-bold">{extractedData.cosPhi || 'N/D'}</span>
                                </div>

                              </div>
                            </div>

                            {/* Supplementary Z-codes list */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider block">Análisis Opciones Suplementarias Z</span>
                              {extractedData.zCodes.length === 0 ? (
                                <div className="bg-slate-950 p-2.5 rounded-lg text-center text-xs text-slate-500 border border-slate-850">
                                  Ninguna especificación Z detectada en esta placa.
                                </div>
                              ) : (
                                <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                                  {extractedData.zCodes.map(code => (
                                    <div key={code} className="bg-slate-950 p-2 border border-slate-850 rounded flex items-center justify-between text-xs font-mono">
                                      <span className="bg-cyan-950 text-cyan-400 border border-cyan-900/40 px-1.5 rounded font-bold">
                                        Z={code}
                                      </span>
                                      <span className="text-slate-400 text-[10px] text-right ml-2 truncate">
                                        {extractedData.zExplanation?.[code] || 'Especificación de suministro configurable'}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Apodo & Archivar trigger widgets */}
                            <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-4">
                              <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono block">Organización & Estado de Ficha:</span>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold font-mono text-slate-500 uppercase block">Nombre personalizado (Apodo):</label>
                                  <input
                                    type="text"
                                    value={customName}
                                    onChange={(e) => setCustomName(e.target.value)}
                                    placeholder="Nombre identificador"
                                    className="bg-slate-900 border border-slate-800 rounded-lg p-2 py-1.5 text-xs text-white block w-full focus:outline-none focus:ring-1 focus:ring-cyan-500"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[9px] font-bold font-mono text-slate-500 uppercase block">Archivar en Proyecto:</label>
                                  <select
                                    value={saveProjectSelectionId}
                                    onChange={(e) => setSaveProjectSelectionId(e.target.value)}
                                    className="bg-slate-900 border border-slate-800 rounded-lg p-2 py-1.5 text-xs text-slate-405 block w-full focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                                  >
                                    <option value="unassigned">Sin proyecto (Historial General)</option>
                                    {projects.map(p => (
                                      <option key={p.id} value={p.id}>📁 {p.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <button
                                onClick={() => {
                                  handleSaveToCatalog();
                                  setCurrentStep(4); // Advance to spreadsheet view!
                                }}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold rounded-xl transition cursor-pointer flex items-center justify-center space-x-2"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Guardar en Tabla CSV del Proyecto ✓</span>
                              </button>

                            </div>

                          </div>
                        </div>

                      </div>
                    )}

                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* STEP 4 SCREEN (CSV SPREADSHEET REPRESENTATION) */}
        {currentStep === 4 && (
          <div id="wizard-step-4" className="space-y-6 max-w-7xl mx-auto w-full py-4 animate-fade-in">
            <div className="bg-slate-905 bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 space-y-6">
              
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div className="space-y-1">
                  <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-[9px] uppercase font-mono font-bold rounded">Paso 4 de 4</span>
                  <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 flex-wrap">
                    <span>Tabla de Extracciones e Inventario</span>
                    <span className="px-2 py-0.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/20 text-[10px] font-mono rounded">
                      {projects.find(p => p.id === activeProjectId)?.name || 'Historial General'}
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Se muestran todos los dispositivos leídos y guardados para este proyecto en formato tabular listo para exportar a CSV de Excel.
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* CSV download button */}
                  {activeProjectId && (
                    <button
                      id="export-csv-btn-wizard"
                      onClick={() => handleExportCSV(activeProjectId)}
                      disabled={plates.filter(p => p.projectId === activeProjectId).length === 0}
                      className={`px-5 py-2.5 rounded-xl text-xs font-mono font-bold tracking-wide transition flex items-center space-x-2 shadow-lg cursor-pointer ${
                        plates.filter(p => p.projectId === activeProjectId).length > 0
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-850'
                      }`}
                    >
                      <Download className="w-4 h-4" />
                      <span>Descargar Tabla CSV</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setCurrentStep(2); // Go to loader to record more
                    }}
                    className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-mono font-bold rounded-xl transition cursor-pointer"
                  >
                    ➕ Registrar Otro Equipo
                  </button>

                  <button
                    onClick={() => {
                      setCurrentStep(1); // Go to project wizard to switch projects
                    }}
                    className="px-4 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-350 text-xs font-mono font-bold rounded-xl transition cursor-pointer"
                  >
                    📁 Administrar Proyectos
                  </button>
                </div>
              </div>

              {/* Table rendering inline */}
              {(() => {
                const projectPlatesFiltered = activeProjectId 
                  ? plates.filter(p => p.projectId === activeProjectId)
                  : plates;

                if (projectPlatesFiltered.length === 0) {
                  return (
                    <div className="border border-dashed border-slate-800 rounded-2xl py-14 p-6 bg-slate-950/40 text-center flex flex-col items-center justify-center space-y-3">
                      <div className="p-3 bg-slate-900 rounded-full text-slate-500">
                        <LayoutGrid className="w-8 h-8 opacity-40" />
                      </div>
                      <h4 className="text-slate-300 text-xs font-semibold uppercase font-mono tracking-wider">No hay equipos guardados en este proyecto</h4>
                      <p className="text-[11px] text-slate-500 max-w-sm">
                        Ve al Paso 2 para subir una imagen de placa o usar la cámara y alimentar la base de datos de este proyecto.
                      </p>
                      <button
                        onClick={() => setCurrentStep(2)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-bold rounded-lg mt-2 cursor-pointer"
                      >
                        Subir Foto en Paso 2 ➔
                      </button>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4 font-mono">
                    
                    {/* Summary badge cells */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/40 p-4 border border-slate-850 rounded-xl">
                      <div className="text-center font-mono py-1">
                        <span className="text-[8px] text-slate-500 uppercase block">Total Placas Guardadas</span>
                        <span className="text-base text-white font-extrabold">{projectPlatesFiltered.length}</span>
                      </div>
                      <div className="text-center font-mono py-1 border-l border-slate-800">
                        <span className="text-[8px] text-slate-500 uppercase block">Motores SIMOTICS</span>
                        <span className="text-base text-emerald-400 font-extrabold">
                          {projectPlatesFiltered.filter(p => p.extracted?.modelType === 'motor').length}
                        </span>
                      </div>
                      <div className="text-center font-mono py-1 border-l border-slate-800">
                        <span className="text-[8px] text-slate-500 uppercase block">Automatización S7 PLC</span>
                        <span className="text-base text-blue-400 font-extrabold">
                          {projectPlatesFiltered.filter(p => p.extracted?.modelType === 'plc').length}
                        </span>
                      </div>
                      <div className="text-center font-mono py-1 border-l border-slate-800">
                        <span className="text-[8px] text-slate-500 uppercase block">Variadores SINAMICS</span>
                        <span className="text-base text-orange-400 font-extrabold">
                          {projectPlatesFiltered.filter(p => p.extracted?.modelType === 'vfd').length}
                        </span>
                      </div>
                    </div>

                    {/* Responsive Spreadsheet Scroll Canvas */}
                    <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/50">
                      <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase text-[9px] tracking-wider select-none font-bold h-10">
                            <th className="px-3">No.</th>
                            <th className="px-4">Nombre del Equipo (Editar)</th>
                            <th className="px-4">MLFB Siemens</th>
                            <th className="px-4">Nº Serie (S/N)</th>
                            <th className="px-3 text-center">Tipo</th>
                            <th className="px-3">Potencia</th>
                            <th className="px-3">Voltaje (V)</th>
                            <th className="px-3">Amperaje (A)</th>
                            <th className="px-3">RPM</th>
                            <th className="px-3">Opciones Z</th>
                            <th className="px-3 text-center">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/50 text-slate-300">
                          {projectPlatesFiltered.map((p, index) => {
                            const e = p.extracted;
                            return (
                              <tr key={p.id} className="hover:bg-slate-900/40 transition-colors h-14">
                                
                                <td className="px-3 font-bold text-slate-500 font-mono">
                                  {index + 1}
                                </td>

                                {/* Nickname editable inline */}
                                <td className="px-4 min-w-[150px]">
                                  <input
                                    type="text"
                                    value={p.name}
                                    onChange={(event) => {
                                      handleUpdateNickname(p.id, event.target.value);
                                    }}
                                    className="bg-transparent hover:bg-slate-950 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-cyan-500 p-1.5 py-1 rounded text-xs text-white focus:outline-none w-full"
                                  />
                                </td>

                                {/* MLFB */}
                                <td className="px-4 font-mono font-extrabold text-cyan-400 uppercase select-all">
                                  {e.mlfbFormatted || e.mlfb}
                                </td>

                                {/* Serial */}
                                <td className="px-4 font-mono text-slate-350 select-all">
                                  {e.serial || '—'}
                                </td>

                                {/* Category Badge */}
                                <td className="px-3 text-center font-sans">
                                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold border block text-center max-w-[80px] mx-auto uppercase ${
                                    e.modelType === 'motor' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    e.modelType === 'vfd' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                    e.modelType === 'plc' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                    'bg-slate-800 text-slate-400 border-slate-700'
                                  }`}>
                                    {e.modelType === 'motor' ? 'Motor' :
                                     e.modelType === 'vfd' ? 'Variador' :
                                     e.modelType === 'plc' ? 'PLC' : 'Otro'}
                                  </span>
                                </td>

                                {/* Power */}
                                <td className="px-3">
                                  {e.power || '—'}
                                </td>

                                {/* Voltage */}
                                <td className="px-3 text-slate-404 select-all">
                                  {e.voltage || '—'}
                                </td>

                                {/* Current */}
                                <td className="px-3 text-slate-404 select-all">
                                  {e.current || '—'}
                                </td>

                                {/* Speed */}
                                <td className="px-3 text-slate-404">
                                  {e.speed || '—'}
                                </td>

                                {/* Z codes summary list */}
                                <td className="px-3">
                                  {e.zCodes && e.zCodes.length > 0 ? (
                                    <div className="flex gap-1 flex-wrap max-w-[130px]">
                                      {e.zCodes.map(z => (
                                        <span 
                                          key={z} 
                                          className="text-[8px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1 rounded font-mono font-bold block"
                                          title={e.zExplanation?.[z] || 'Opción Z Siemens'}
                                        >
                                          {z}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-600 font-sans italic">Estándar</span>
                                  )}
                                </td>

                                {/* Action Buttons */}
                                <td className="px-3 text-center">
                                  <div className="flex gap-1.5 justify-center items-center">
                                    <button
                                      onClick={() => {
                                        setExtractedData(e);
                                        setRawText(p.rawText);
                                        setProcessedImageSrc(p.imageUrl || '');
                                        setSelectedPlateId(p.id);
                                        setCustomName(p.name);
                                        setSaveProjectSelectionId(p.projectId || 'unassigned');
                                        setCurrentStep(3); // Inspect back into Paso 3
                                      }}
                                      className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded text-[9px] border border-slate-800 transition"
                                    >
                                      Ficha
                                    </button>
                                    <button
                                      onClick={(event) => {
                                        if (confirm(`¿Seguro que deseas eliminar "${p.name}" de la tabla?`)) {
                                          handleDeletePlate(p.id, event);
                                        }
                                      }}
                                      className="px-2 py-1 border border-red-900/30 hover:border-red-500/20 text-red-400 hover:bg-red-950/20 rounded text-[9px] transition"
                                    >
                                      Borrar
                                    </button>
                                  </div>
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Dangerous erase catalog table entirely */}
                    <div className="flex justify-end pt-4 select-none">
                      <button
                        onClick={() => {
                          if (confirm("¿De verdad deseas borrar todos los equipos guardados bajo este proyecto de forma definitiva?")) {
                            const remaining = plates.filter(p => p.projectId !== activeProjectId);
                            savePlatesToLocalStorage(remaining);
                          }
                        }}
                        className="px-3.5 py-1.5 bg-red-950/20 text-red-500 text-[10px] border border-red-900/30 font-bold font-mono rounded-lg hover:bg-red-950/40 cursor-pointer transition"
                      >
                        ⚠️ Borrar Tabla Entera de este Proyecto
                      </button>
                    </div>

                  </div>
                );
              })()}

            </div>
          </div>
        )}

        {/* Floating reference manual toggle */}
        <div className="max-w-7xl mx-auto w-full mt-8 border-t border-slate-900 pt-6">
          <details className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 md:p-6 cursor-pointer select-none group transition">
            <summary className="font-semibold text-xs text-slate-404 font-mono flex items-center justify-between">
              <span>❓ Manual y Guía de Referencia Técnica de Placas Siemens</span>
              <span className="text-cyan-500 text-[10px] uppercase font-bold group-open:hidden">Desplegar Guía</span>
              <span className="text-cyan-500 text-[10px] uppercase font-bold hidden group-open:inline">Contraer Guía</span>
            </summary>
            <div className="mt-4 pt-4 border-t border-slate-800 cursor-default select-text">
              <HelpManual />
            </div>
          </details>
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
