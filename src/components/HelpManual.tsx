/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HelpCircle, HardDrive, Layers, Cpu, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function HelpManual() {
  const [activeTab, setActiveTab] = useState<'motor' | 'vfd' | 'plc' | 'ocr'>('motor');

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center space-x-2">
        <HelpCircle className="w-4 h-4 text-cyan-400" />
        <h3 className="font-sans font-semibold text-xs tracking-wider text-slate-200 uppercase">
          Manual de Ayuda y Estructura Siemens
        </h3>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-800 bg-slate-950/40 text-xs">
        <button
          onClick={() => setActiveTab('motor')}
          className={`flex-1 py-3 px-1 text-center border-b-2 font-medium transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeTab === 'motor' ? 'border-emerald-500 text-emerald-400 bg-emerald-950/10 font-bold' : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>Motores</span>
        </button>
        <button
          onClick={() => setActiveTab('vfd')}
          className={`flex-1 py-3 px-1 text-center border-b-2 font-medium transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeTab === 'vfd' ? 'border-amber-500 text-amber-400 bg-amber-950/10 font-bold' : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Variadores</span>
        </button>
        <button
          onClick={() => setActiveTab('plc')}
          className={`flex-1 py-3 px-1 text-center border-b-2 font-medium transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeTab === 'plc' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10 font-bold' : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Autómatas/HMI</span>
        </button>
        <button
          onClick={() => setActiveTab('ocr')}
          className={`flex-1 py-3 px-1 text-center border-b-2 font-medium transition cursor-pointer flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
            activeTab === 'ocr' ? 'border-cyan-500 text-cyan-400 bg-cyan-950/10 font-bold' : 'border-transparent text-slate-400 hover:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Calidad OCR</span>
        </button>
      </div>

      {/* Manual Content */}
      <div className="p-4 space-y-4 text-xs text-slate-300 leading-relaxed">
        {activeTab === 'motor' && (
          <div className="space-y-3">
            <h4 className="font-bold text-emerald-400 flex items-center space-x-1 font-mono uppercase tracking-wide">
              <span>Motores SIMOTICS (1LA / 1LE / 1LG)</span>
            </h4>
            <p>
              En motores Siemens de corriente alterna, los códigos MLFB y Z aparecen habitualmente en la parte media superior de la placa metálica de características.
            </p>
            
            <div className="p-3 bg-slate-950 rounded-xl space-y-2 border border-slate-800 font-mono text-[10px]">
              <div className="text-slate-550 text-center border-b border-slate-900 pb-1 mb-1 font-semibold tracking-wider">
                SIEMENS MOTORPLATE SIMULATOR
              </div>
              <div className="flex justify-between text-slate-400">
                <span>3~Mot. 1LE1001-1DB43-4AF4-Z</span>
                <span className="text-emerald-400 font-bold">&larr; MLFB principal</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>IEC/EN 60034   90L   IP55</span>
                <span>No. UD 1502446/1</span>
              </div>
              <div className="flex justify-between text-slate-400 border-t border-slate-900/50 pt-1">
                <span className="text-amber-400">Z = A11+K20+L22</span>
                <span className="text-emerald-400 font-bold">&larr; Opciones Z (PTC, Prensacables, Rodamiento)</span>
              </div>
            </div>

            <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
              <li>
                <strong>MLFB Motor:</strong> Empieza con <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">1LE</code>, <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">1LA</code> o <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">1LG</code> seguido del tamaño de carcasa y códigos de bobinado. Generalmente compuesto por 12 o 16 caracteres.
              </li>
              <li>
                <strong>Z-Codes:</strong> Si el motor incluye opciones especiales, el código MLFB suele finalizar en <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">-Z</code>. Debajo, habrá una línea indicando <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">Z = [lista de códigos de 3 dígitos]</code> separados por espacios o el signo más (+), representando las modificaciones de fábrica.
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'vfd' && (
          <div className="space-y-3">
            <h4 className="font-bold text-amber-450 flex items-center space-x-1 font-mono uppercase tracking-wide">
              <span>Sistemas de Accionamiento SINAMICS (6SL)</span>
            </h4>
            <p>
              Los variadores de frecuencia de baja tensión (SINAMICS G120, V20, S120, etc.) y los arrancadores suaves SIRIUS disponen su placa de características adhesiva en el lateral o bajo la tapa frontal de mandos.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl space-y-1.5 border border-slate-800 font-mono text-[10px]">
              <div className="text-slate-550 text-center border-b border-slate-900 pb-1 mb-1 font-semibold tracking-wider">
                SINAMICS POWER MODULE LABEL
              </div>
              <div className="flex justify-between text-slate-400">
                <span>SIEMENS</span>
                <span>SINAMICS G120 PM240-2</span>
              </div>
              <div className="flex justify-between text-slate-450 font-bold text-amber-400">
                <span>6SL3210-5BE22-2UV0</span>
                <span>&larr; MLFB del módulo de potencia</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>INPUT: 3AC 380-480V 50/60Hz</span>
                <span>OUTPUT: 2.2 kW (3.0 HP)</span>
              </div>
            </div>

            <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
              <li>
                <strong>MLFB Accionamiento:</strong> El código suele empezar por <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">6SL</code>. La estructura define el tipo de convertidor, el voltaje de entrada, filtros de armónicos internos e interfaz de bus.
              </li>
              <li>
                <strong>Códigos de Opción:</strong> Los variadores modulares no suelen indicar opciones Z separadas, sino que se integran en el sufijo MLFB. Por ejemplo, <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">6SL3210-5BE...</code> define que incorpora un filtro de supresión de categoría C2.
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'plc' && (
          <div className="space-y-3">
            <h4 className="font-bold text-cyan-400 flex items-center space-x-1 font-mono uppercase tracking-wide">
              <span>Automatización SIMATIC (6ES7 / 6AV)</span>
            </h4>
            <p>
              PLCs, HMI y módulos periféricos distribuidos llevan un número de referencia (MLFB) grabado por láser o impreso en la cara frontal o lateral, junto a los esquemas de conexión eléctricos.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl space-y-1.5 border border-slate-800 font-mono text-[10px]">
              <div className="text-slate-550 text-center border-b border-slate-900 pb-1 mb-1 font-semibold tracking-wider font-mono">
                SIMATIC S7 MODULE ENGRAVING
              </div>
              <div className="flex justify-between text-slate-400">
                <span>SIMATIC S7-1500 CPU 1511-1 PN</span>
              </div>
              <div className="flex justify-between text-slate-450 font-bold text-cyan-400">
                <span>6ES7511-1AK02-0AB0</span>
                <span>&larr; MLFB de Automatización</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>HW: 01  FW: V2.9.2</span>
                <span>S VP-B341052</span>
              </div>
            </div>

            <ul className="space-y-1.5 list-disc pl-4 text-slate-400">
              <li>
                <strong>Estructura MLFB:</strong> Los elementos de control empiezan universalmente por <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">6ES7</code> para controladores S7 y periferia, y por <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">6AV</code> para pantallas táctiles HMI.
              </li>
              <li>
                <strong>Sin códigos Z:</strong> Los dispositivos electrónicos SIMATIC y fuentes SITOP (<code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">6EP</code>) no emplean suplementos tipo Z-code, sino que declaran versiones de Hardware (HW) y Firmware (FW) por separado.
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'ocr' && (
          <div className="space-y-3">
            <h4 className="font-bold text-cyan-400 flex items-center space-x-1 font-mono uppercase tracking-wide">
              <span>Resolución de Problemas de Lectura</span>
            </h4>
            <p>
              Tesseract opera de manera 100% interna en tu navegador. Para extraer con efectividad los caracteres grabados en superficies metálicas, considera:
            </p>

            <div className="space-y-2.5">
              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">Evita reflejos y brillos metálicos:</strong> Las placas de datos de aluminio pulido actúan como espejos. Toma la fotografía ligeramente de lado (ángulo de 15°) y desactiva el flash de la linterna.
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">Preprocesamiento Digital:</strong> Si la placa posee letras plateadas sobre fondo de esmalte azul grisáceo o negro, aplica en nuestro panel de ajuste <strong>Invertir Colores</strong> combinando con un realce de <strong>Contraste</strong> al 130%. Eso simulará texto nítido de alta precisión.
                </div>
              </div>

              <div className="flex items-start space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-200">Ajuste de Dirección de Lectura:</strong> Tesseract realiza lecturas horizontales lineales. Asegúrate que la placa esté completamente derecha. Usa el botón de giro <code className="text-slate-200 bg-slate-800 px-1 rounded font-mono">+90°</code> si tomaste la foto verticalmente con el smartphone.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-3 bg-slate-950 border-t border-slate-800 text-[10px] text-slate-550 text-center">
        Información técnica basada en el sistema de codificación MLFB oficial de Siemens AG.
      </div>
    </div>
  );
}
