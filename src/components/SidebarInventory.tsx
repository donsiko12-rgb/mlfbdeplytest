/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScannedPlate } from '../types';
import { Search, Download, Trash2, Calendar, HardDrive, Cpu, Layers, Tag } from 'lucide-react';

interface SidebarInventoryProps {
  plates: ScannedPlate[];
  selectedPlateId: string | null;
  onSelectPlate: (plate: ScannedPlate) => void;
  onDeletePlate: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  onUpdateNickname: (id: string, newName: string) => void;
}

export default function SidebarInventory({
  plates,
  selectedPlateId,
  onSelectPlate,
  onDeletePlate,
  onClearAll,
  onUpdateNickname
}: SidebarInventoryProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNickname, setTempNickname] = useState<string>('');

  // Filter plates
  const filteredPlates = plates.filter(plate => {
    const matchesSearch = 
      plate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plate.extracted.mlfb.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (plate.extracted.serial && plate.extracted.serial.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || plate.extracted.modelType === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate format details
  const getCategoryIcon = (type: string) => {
    switch (type) {
      case 'motor':
        return <HardDrive className="w-4 h-4 text-emerald-400" />;
      case 'vfd':
        return <Layers className="w-4 h-4 text-orange-400" />;
      case 'plc':
        return <Cpu className="w-4 h-4 text-blue-400" />;
      default:
        return <Tag className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryLabel = (type: string) => {
    switch (type) {
      case 'motor': return 'Motor';
      case 'vfd': return 'Variador';
      case 'plc': return 'Autómata/HMI';
      case 'switchgear': return 'Aparamenta';
      default: return 'Otro';
    }
  };

  // Export to CSV
  const exportToCsv = () => {
    if (plates.length === 0) return;

    // Build CSV content
    const headers = [
      'Nombre de Dispositivo',
      'MLFB (Codigo de Catalogo)',
      'Numero de Serie',
      'Categoria',
      'Fecha Fab (FD)',
      'Opciones Z',
      'Voltaje (V)',
      'Corriente (A)',
      'Potencia',
      'Velocidad (RPM)',
      'Frecuencia (Hz)',
      'Cos Phi',
      'Clase IP',
      'Peso',
      'Eficiencia',
      'Fecha Escaneo'
    ];

    const rows = plates.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.extracted.mlfb}"`,
      `"${p.extracted.serial || ''}"`,
      `"${getCategoryLabel(p.extracted.modelType)}"`,
      `"${p.extracted.fdDate || ''}"`,
      `"${p.extracted.zCodes.join(', ')}"`,
      `"${p.extracted.voltage || ''}"`,
      `"${p.extracted.current || ''}"`,
      `"${p.extracted.power || ''}"`,
      `"${p.extracted.speed || ''}"`,
      `"${p.extracted.frequency || ''}"`,
      `"${p.extracted.cosPhi || ''}"`,
      `"${p.extracted.ipRating || ''}"`,
      `"${p.extracted.weight || ''}"`,
      `"${p.extracted.efficiency || ''}"`,
      `"${new Date(p.timestamp).toLocaleString()}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Siemens_Plate_Inventory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const startEditing = (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setTempNickname(name);
  };

  const saveEditing = (id: string, e: React.MouseEvent | React.FocusEvent) => {
    e.stopPropagation();
    if (tempNickname.trim()) {
      onUpdateNickname(id, tempNickname.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
      {/* Header bar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="font-sans font-bold text-sm tracking-wider text-slate-150 uppercase">
            Catálogo Local (Inventario)
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {plates.length} placa{plates.length !== 1 ? 's' : ''} guardada{plates.length !== 1 ? 's' : ''} en navegador
          </p>
        </div>
        
        {plates.length > 0 && (
          <div className="flex items-center space-x-1.5">
            <button
              id="export-csv-btn"
              onClick={exportToCsv}
              className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-405 hover:text-cyan-300 rounded-lg transition shadow-xs cursor-pointer"
              title="Exportar catálogo completo a CSV"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              id="clear-all-btn"
              onClick={() => {
                if (window.confirm('¿Seguro que deseas eliminar todas las placas escaneadas del historial?')) {
                  onClearAll();
                }
              }}
              className="p-2 bg-red-950/20 hover:bg-red-950/50 border border-red-900/30 text-red-400 hover:text-red-300 rounded-lg transition cursor-pointer"
              title="Borrar catálogo completo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Filters & Search */}
      <div className="p-3 bg-slate-950/50 border-b border-slate-800 space-y-2">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-500" />
          </span>
          <input
            id="plate-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por MLFB, apodo o S/N..."
            className="block w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-[11px]"
          />
        </div>

        <select
          id="category-filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="block w-full px-2.5 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          <option value="all">Sectores: Todos los Equipos</option>
          <option value="motor">Sectores: Motores SIMOTICS</option>
          <option value="vfd">Sectores: Variadores SINAMICS</option>
          <option value="plc">Sectores: Automatización SIMATIC</option>
          <option value="switchgear">Sectores: Conmutación SIRIUS</option>
          <option value="other">Sectores: Otros</option>
        </select>
      </div>

      {/* Plates Catalog list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[380px] lg:max-h-none">
        {filteredPlates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <Layers className="w-10 h-10 text-slate-700 mb-2.5" />
            <p className="text-xs text-slate-400 font-semibold">Sin equipos guardados</p>
            <p className="text-[10px] text-slate-500 mt-1 max-w-[180px]">
              {searchQuery || categoryFilter !== 'all' 
                ? 'Ningún registro coincide con los filtros aplicados.' 
                : 'Carga una foto de placa o escanea usando tu cámara para archivar.'}
            </p>
          </div>
        ) : (
          filteredPlates.map((plate) => {
            const isSelected = selectedPlateId === plate.id;
            const isEditing = editingId === plate.id;

            return (
              <div
                key={plate.id}
                id={`scanned-plate-item-${plate.id}`}
                onClick={() => onSelectPlate(plate)}
                className={`group p-3 rounded-xl border text-left cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-cyan-950/30 border-cyan-500/80 bg-slate-900/40 shadow-inner'
                    : 'bg-slate-950/40 border-slate-850 hover:border-slate-700 hover:bg-slate-950/80'
                }`}
              >
                {/* Meta line */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-1.5">
                    {getCategoryIcon(plate.extracted.modelType)}
                    <span className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold font-mono">
                      {getCategoryLabel(plate.extracted.modelType)}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-550 font-mono">
                    {new Date(plate.timestamp).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                  </span>
                </div>

                {/* Nickname line */}
                <div className="mb-1.5 select-none" onClick={(e) => isEditing && e.stopPropagation()}>
                  {isEditing ? (
                    <input
                      type="text"
                      value={tempNickname}
                      onChange={(e) => setTempNickname(e.target.value)}
                      onBlur={(e) => saveEditing(plate.id, e)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEditing(plate.id, e as any)}
                      autoFocus
                      className="w-full bg-slate-900 text-xs text-white px-2 py-0.5 border border-cyan-500 rounded focus:outline-none font-mono"
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors font-mono line-clamp-1">
                        {plate.name}
                      </h4>
                      <button
                        onClick={(e) => startEditing(plate.id, plate.name, e)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-cyan-400 hover:text-cyan-300 text-[10px] font-medium transition-all cursor-pointer"
                        title="Cambiar apodo"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </div>

                {/* Technical data summary */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center bg-slate-900/60 px-1.5 py-0.5 rounded text-[10px] font-mono">
                    <span className="text-slate-500 font-sans">MLFB:</span>
                    <span className="text-slate-350 font-bold select-all line-clamp-1">{plate.extracted.mlfb}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-[10px] font-mono text-slate-450 px-0.5">
                    {plate.extracted.serial && (
                      <span className="line-clamp-1">S/N: {plate.extracted.serial}</span>
                    )}
                    {plate.extracted.power && (
                      <span className="ml-auto text-cyan-400/80 font-bold">{plate.extracted.power}</span>
                    )}
                  </div>
                </div>

                {/* Delete button (only visible on hover to reduce visual clutter) */}
                <div className="flex justify-end pt-1.5 mt-1.5 border-t border-slate-850/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => onDeletePlate(plate.id, e)}
                    className="flex items-center space-x-1 px-1.5 py-0.5 text-red-400 hover:text-red-300 hover:bg-red-950/20 rounded transition text-[9px] cursor-pointer"
                    title="Eliminar de mi catálogo"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Eliminar</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Empty visual instructions */}
      <div className="p-3 bg-slate-950 border-t border-slate-850 text-[10px] text-slate-500 flex items-center space-x-2">
        <Calendar className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
        <span>Tus datos se guardan de manera persistente en tu navegador local (localStorage).</span>
      </div>
    </div>
  );
}
