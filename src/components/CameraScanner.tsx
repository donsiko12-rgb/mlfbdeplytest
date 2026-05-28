/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw, AlertCircle, X, Check } from 'lucide-react';

interface CameraScannerProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

export default function CameraScanner({ onCapture, onClose }: CameraScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState<boolean | null>(null);

  // Load available camera devices
  useEffect(() => {
    async function initCamera() {
      try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraPermissionGranted(true);
        initialStream.getTracks().forEach(track => track.stop());

        const mediaDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = mediaDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);

        if (videoDevices.length > 0) {
          // Look for a back/rear camera by default for better scanning
          const backCamera = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('rear') || d.label.toLowerCase().includes('entorno'));
          setSelectedDeviceId(backCamera ? backCamera.deviceId : videoDevices[0].deviceId);
        }
      } catch (err: any) {
        console.error('Error initializing camera:', err);
        setCameraPermissionGranted(false);
        setError('No se pudo acceder a la cámara. Asegúrate de dar permisos de cámara en tu navegador e iframe.');
      }
    }

    initCamera();

    return () => {
      stopCamera();
    };
  }, []);

  // Restart camera when device changes
  useEffect(() => {
    if (selectedDeviceId) {
      startCamera(selectedDeviceId);
    }
  }, [selectedDeviceId]);

  const startCamera = async (deviceId: string) => {
    stopCamera();
    try {
      setError('');
      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          facingMode: deviceId ? undefined : 'environment'
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error('Error starting camera stream:', err);
      setError('Fallo al cargar este dispositivo de cámara. Es posible que esté en uso por otra aplicación.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      
      // Capture at video native size for maximum resolution / OCR quality!
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw current frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onCapture(dataUrl);
        stopCamera();
      }
    }
  };

  return (
    <div id="camera-scanner-modal" className="relative bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl border border-slate-800">
      {/* Header bar */}
      <div className="flex items-center justify-between p-4 bg-slate-950 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Camera className="w-5 h-5 text-cyan-400" />
          <h3 className="font-sans font-semibold text-sm tracking-wide text-slate-200 uppercase">
            Escanear Placa Siemens
          </h3>
        </div>
        <button
          id="close-camera-btn"
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-1.5 bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-white rounded-full transition-all cursor-pointer"
          title="Cerrar cámara"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main viewport */}
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
        {error ? (
          <div className="flex flex-col items-center justify-center p-6 text-center max-w-md">
            <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
            <p id="camera-error-msg" className="text-sm text-slate-350">{error}</p>
            <button
              onClick={() => {
                if (selectedDeviceId) startCamera(selectedDeviceId);
              }}
              className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-all cursor-pointer"
            >
              Reintentar Conexión
            </button>
          </div>
        ) : (
          <>
            {/* The live video stream */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Bounding box guide overlay of Siemens plate */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-12">
              <div className="text-center">
                <span className="bg-slate-950/80 backdrop-blur-xs text-xs md:text-sm text-slate-300 px-3 py-1.5 rounded-full border border-slate-800 shadow-md">
                  Alinea la placa de características dentro del recuadro
                </span>
              </div>
              
              {/* Outer grid visual for professional targeting */}
              <div className="flex-1 flex items-center justify-center my-4 md:my-8">
                <div className="w-4/5 h-4/5 border-2 border-dashed border-cyan-400/50 rounded-lg relative overflow-hidden bg-slate-900/10">
                  {/* Bounding box corners */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 -mt-1 -ml-1 rounded-tl-sm"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 -mt-1 -mr-1 rounded-tr-sm"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 -mb-1 -ml-1 rounded-bl-sm"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 -mb-1 -mr-1 rounded-br-sm"></div>
                  
                  {/* Glowing focus visual line */}
                  <div className="absolute left-0 right-0 h-0.5 bg-cyan-400/30 top-1/2"></div>
                </div>
              </div>

              <div className="text-center">
                <span className="bg-slate-950/85 text-[10px] text-slate-400 px-2 py-1 rounded-md">
                  Evita reflejos y mantén el teléfono perpendicular a la placa
                </span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Control panel bar */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Camera device selector */}
        <div className="w-full sm:w-auto flex items-center space-x-2">
          <label htmlFor="camera-select" className="text-xs text-slate-400 whitespace-nowrap font-mono">Cámara:</label>
          <select
            id="camera-select"
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            className="bg-slate-900 text-xs text-slate-300 rounded-xl py-1.5 px-3 border border-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500 w-full sm:max-w-xs font-mono"
          >
            {devices.map((device, idx) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Cámara ${idx + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* Shutter capture trigger button */}
        <button
          id="shutter-btn"
          onClick={capturePhoto}
          disabled={!!error || !selectedDeviceId}
          className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-800 disabled:text-slate-600 text-black font-semibold text-xs rounded border border-slate-800 flex items-center space-x-2 shadow-lg transition-all active:scale-95 cursor-pointer ml-auto"
        >
          <Camera className="w-4 h-4" />
          <span>CAPTURAR PLACA</span>
        </button>

        {/* Quick hint */}
        <div className="hidden md:flex items-center space-x-1.5 text-xs text-slate-450">
          <Check className="w-3.5 h-3.5 text-green-500" />
          <span>Local, seguro y sin datos en la nube</span>
        </div>
      </div>
    </div>
  );
}
