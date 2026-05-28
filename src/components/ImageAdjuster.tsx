/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { RotateCw, Maximize, RefreshCw, Sun, Sliders, Eye, HelpCircle } from 'lucide-react';

interface ImageAdjusterProps {
  src: string;
  onProcessed: (processedDataUrl: string) => void;
  onCancel: () => void;
}

export default function ImageAdjuster({ src, onProcessed, onCancel }: ImageAdjusterProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // States for filters
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270
  const [contrast, setContrast] = useState<number>(120); // 100 is normal
  const [brightness, setBrightness] = useState<number>(100); // 100 is normal
  const [grayscale, setGrayscale] = useState<boolean>(true);
  const [invert, setInvert] = useState<boolean>(false);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // Load image
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageRef.current = img;
      setIsLoaded(true);
      applyFilters();
    };
    img.src = src;
  }, [src]);

  // Re-apply filters when settings change
  useEffect(() => {
    if (isLoaded) {
      applyFilters();
    }
  }, [rotation, contrast, brightness, grayscale, invert, isLoaded]);

  const applyFilters = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate dimensions based on rotation
    const isRotated90or270 = rotation === 90 || rotation === 270;
    const canvasWidth = isRotated90or270 ? img.naturalHeight : img.naturalWidth;
    const canvasHeight = isRotated90or270 ? img.naturalWidth : img.naturalHeight;

    // Set canvas dimensions (limit maximum size for performance while retaining high OCR density)
    const MAX_DIM = 1600;
    let scale = 1;
    if (Math.max(canvasWidth, canvasHeight) > MAX_DIM) {
      scale = MAX_DIM / Math.max(canvasWidth, canvasHeight);
    }

    canvas.width = canvasWidth * scale;
    canvas.height = canvasHeight * scale;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply rotation translations on canvas
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);

    const drawWidth = img.naturalWidth * scale;
    const drawHeight = img.naturalHeight * scale;
    
    ctx.drawImage(img, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
    ctx.restore();

    // Retrieve pixel buffer to apply lighting, contrast, grayscale, and invert manually
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const brightOffset = brightness - 100;

    for (let i = 0; i < data.length; i += 4) {
      let r = data[i];
      let g = data[i+1];
      let b = data[i+2];

      // 1. Contrast Adjustment
      r = contrastFactor * (r - 128) + 128;
      g = contrastFactor * (g - 128) + 128;
      b = contrastFactor * (b - 128) + 128;

      // 2. Brightness adjustment
      r += brightOffset;
      g += brightOffset;
      b += brightOffset;

      // 3. Grayscale
      if (grayscale) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray;
        g = gray;
        b = gray;
      }

      // 4. Invert (optional)
      if (invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      // Pin bounds
      data[i] = Math.min(255, Math.max(0, r));
      data[i+1] = Math.min(255, Math.max(0, g));
      data[i+2] = Math.min(255, Math.max(0, b));
    }

    ctx.putImageData(imageData, 0, 0);
  };

  const rotateRight = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleApply = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      onProcessed(dataUrl);
    }
  };

  const resetAll = () => {
    setRotation(0);
    setContrast(120);
    setBrightness(100);
    setGrayscale(true);
    setInvert(false);
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="font-sans font-semibold text-xs tracking-wider text-slate-200 uppercase">
            Ajustar Imagen para OCR
          </h3>
        </div>
        <button
          onClick={resetAll}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition cursor-pointer"
        >
          Valores por defecto
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 p-4">
        {/* Canvas preview */}
        <div className="lg:col-span-7 bg-slate-950 rounded-xl p-3 flex items-center justify-center min-h-[300px] border border-slate-800 relative">
          <canvas ref={canvasRef} className="max-w-full max-h-[350px] object-contain shadow-md rounded" />
          {!isLoaded && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 space-x-2 bg-slate-950/80">
              <RefreshCw className="w-5 h-5 animate-spin text-cyan-500" />
              <span className="text-xs">Cargando imagen...</span>
            </div>
          )}
        </div>

        {/* Adjusting panel - controls */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            {/* Rotation controls */}
            <div>
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 font-mono">
                Rotación de Texto
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={rotateRight}
                  className="flex items-center justify-center space-x-2 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-xs font-medium cursor-pointer transition w-full"
                >
                  <RotateCw className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Girar +90°</span>
                </button>
                <div className="text-xs font-mono text-slate-405 text-center px-2">
                  {rotation}°
                </div>
              </div>
              <p className="text-[10px] text-slate-500 mt-1 font-sans">
                Gira hasta que el texto de la marca Siemens esté perfectamente horizontal.
              </p>
            </div>

            {/* Sliders for Contrast & Brightness */}
            <div className="space-y-3 pt-2">
              <div>
                <div className="flex justify-between items-center mb-1 font-mono text-[11px]">
                  <span className="text-slate-350 font-medium">Contraste ({contrast}%)</span>
                  <span className="text-[10px] text-slate-500">(Recomendado &gt; 110%)</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="250"
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1 font-mono text-[11px]">
                  <span className="text-slate-350 font-medium">Brillo ({brightness}%)</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="180"
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>

            {/* Binary filters switches */}
            <div className="pt-2 space-y-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2 font-mono">
                Filtros Digitales
              </label>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-200 font-medium">Filtro Blanco y Negro</span>
                  <span className="text-[10px] text-slate-500">Elimina ruido cromático</span>
                </div>
                <button
                  onClick={() => setGrayscale(!grayscale)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${grayscale ? 'bg-cyan-500' : 'bg-slate-800'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${grayscale ? 'translate-x-5' : ''}`}></div>
                </button>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex flex-col">
                  <span className="text-xs text-slate-200 font-medium">Invertir Colores</span>
                  <span className="text-[10px] text-slate-500">Letras plateadas sobre metal oscuro</span>
                </div>
                <button
                  onClick={() => setInvert(!invert)}
                  className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition ${invert ? 'bg-cyan-500' : 'bg-slate-800'}`}
                >
                  <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${invert ? 'translate-x-5' : ''}`}></div>
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center space-x-2 pt-2 border-t border-slate-800">
            <button
               onClick={onCancel}
              className="px-4 py-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-350 text-xs rounded transition-all cursor-pointer w-1/3 text-center"
            >
              Cancelar
            </button>
            <button
              onClick={handleApply}
              disabled={!isLoaded}
              className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 text-black font-semibold text-xs rounded border border-slate-800 transition-all flex-1 text-center cursor-pointer shadow-md"
            >
              Confirmar y Analizar OCR
            </button>
          </div>
        </div>
      </div>
      
      {/* Tips panel */}
      <div className="bg-cyan-950/20 px-4 py-3 border-t border-slate-800 flex items-start space-x-2 text-[10px] text-cyan-300 font-mono">
        <Sun className="w-4 h-4 flex-shrink-0 text-cyan-400 mt-0.5" />
        <span id="adjustment-advice">
          <strong>Consejo para Placas Siemens de Metal Grabado:</strong> Aumenta el <strong>contraste</strong> al 140% e <strong>Invierte los colores</strong>. Esto suele transformar el grabado mate sobre fondo reflectante en letras negras sobre fondo blanco de alta legibilidad para el lector OCR.
        </span>
      </div>
    </div>
  );
}
