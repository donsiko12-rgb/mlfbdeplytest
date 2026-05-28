/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ScannedPlate, Project } from '../types';
import { 
  Search, 
  Download, 
  Trash2, 
  Calendar, 
  HardDrive, 
  Cpu, 
  Layers, 
  Tag, 
  Folder, 
  FolderOpen, 
  ChevronDown, 
  ChevronRight, 
  Plus, 
  Sparkles 
} from 'lucide-react';

interface SidebarInventoryProps {
  plates: ScannedPlate[];
  projects: Project[];
  activeProjectId: string | null;
  selectedPlateId: string | null;
  onSelectPlate: (plate: ScannedPlate) => void;
  onDeletePlate: (id: string, e: React.MouseEvent) => void;
  onClearAll: () => void;
  onUpdateNickname: (id: string, newName: string) => void;
  onCreateProject: (name: string) => void;
  onDeleteProject: (projectId: string) => void;
  onSetActiveProject: (projectId: string | null) => void;
}

export default function SidebarInventory({
  plates,
  projects,
  activeProjectId,
  selectedPlateId,
  onSelectPlate,
  onDeletePlate,
  onClearAll,
  onUpdateNickname,
  onCreateProject,
  onDeleteProject,
  onSetActiveProject
}: SidebarInventoryProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempNickname, setTempNickname] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({ unassigned: true });

  // Handle inline project creation
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      onCreateProject(newProjectName.trim());
      
      // Auto expand newly created project
      const tempId = 'proj_temp_expand'; // App will assign a real ID, we'll expand the active project in useEffect or handle it
      setNewProjectName('');
    }
  };

  const toggleProjectExpand = (projId: string) => {
    setExpandedProjects(prev => ({
      ...prev,
      [projId]: !prev[projId]
    }));
  };

  // Helper to filter and retrieve plates for a specific project
  const getProjectPlates = (projectId: string | null) => {
    return plates.filter(plate => {
      // Evaluate project association (null handles plates with no project or missing projects)
      const belongs = projectId === null 
        ? !plate.projectId || !projects.some(p => p.id === plate.projectId)
        : plate.projectId === projectId;

      if (!belongs) return false;

      // Evaluate search and category filters
      const matchesSearch = 
        plate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        plate.extracted.mlfb.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (plate.extracted.serial && plate.extracted.serial.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = categoryFilter === 'all' || plate.extracted.modelType === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  };

  // Calculate icon based on device category
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

    const headers = [
      'Proyecto',
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

    const rows = plates.map(p => {
      const associatedProj = projects.find(proj => proj.id === p.projectId);
      const projName = associatedProj ? associatedProj.name : 'Sin Proyecto';

      return [
        `"${projName.replace(/"/g, '""')}"`,
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
      ];
    });

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

  // Render individual plate block inside folders
  const renderPlateItem = (plate: ScannedPlate) => {
    const isSelected = selectedPlateId === plate.id;
    const isEditing = editingId === plate.id;

    return (
      <div
        key={plate.id}
        id={`scanned-plate-item-${plate.id}`}
        onClick={() => onSelectPlate(plate)}
        className={`group p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
          isSelected
            ? 'bg-cyan-950/25 border-cyan-500/70 bg-slate-900/30'
            : 'bg-slate-900/40 border-slate-850 hover:border-slate-705 hover:bg-slate-900/80'
        }`}
      >
        {/* Meta line */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center space-x-1">
            {getCategoryIcon(plate.extracted.modelType)}
            <span className="text-[8px] text-slate-400 uppercase tracking-wider font-semibold font-mono">
              {getCategoryLabel(plate.extracted.modelType)}
            </span>
          </div>
          <span className="text-[8px] text-slate-500 font-mono">
            {new Date(plate.timestamp).toLocaleDateString(undefined, {month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
          </span>
        </div>

        {/* Nickname line */}
        <div className="mb-1 select-none" onClick={(e) => isEditing && e.stopPropagation()}>
          {isEditing ? (
            <input
              type="text"
              value={tempNickname}
              onChange={(e) => setTempNickname(e.target.value)}
              onBlur={(e) => saveEditing(plate.id, e)}
              onKeyDown={(e) => e.key === 'Enter' && saveEditing(plate.id, e as any)}
              autoFocus
              className="w-full bg-slate-950 text-[11px] text-white px-2 py-0.5 border border-cyan-500 rounded focus:outline-none font-mono"
            />
          ) : (
            <div className="flex items-center justify-between">
              <h4 className="text-[11px] font-semibold text-slate-300 group-hover:text-cyan-400 transition-colors font-mono line-clamp-1">
                {plate.name}
              </h4>
              <button
                onClick={(e) => startEditing(plate.id, plate.name, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-cyan-400 hover:text-cyan-300 text-[9px] font-medium transition-all cursor-pointer"
                title="Cambiar apodo"
              >
                Editar
              </button>
            </div>
          )}
        </div>

        {/* Technical Data panel inside item */}
        <div className="space-y-1">
          <div className="flex justify-between items-center bg-slate-950/60 px-1.5 py-0.5 rounded text-[9px] font-mono">
            <span className="text-slate-500 font-sans text-[8px]">MLFB:</span>
            <span className="text-slate-350 font-bold select-all line-clamp-1">{plate.extracted.mlfb}</span>
          </div>
          
          <div className="flex justify-between items-center text-[9px] font-mono text-slate-500 px-0.5">
            {plate.extracted.serial && (
              <span className="line-clamp-1">S/N: {plate.extracted.serial}</span>
            )}
            {plate.extracted.power && (
              <span className="ml-auto text-cyan-400/70 font-bold">{plate.extracted.power}</span>
            )}
          </div>
        </div>

        {/* Action ribbon on hover */}
        <div className="flex justify-end pt-1 mt-1 border-t border-slate-850/30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => onDeletePlate(plate.id, e)}
            className="flex items-center space-x-1 px-1 py-0.2 text-red-400 hover:text-red-350 hover:bg-red-950/15 rounded transition text-[8px] cursor-pointer"
            title="Eliminar del catálogo"
          >
            <Trash2 className="w-2.5 h-2.5" />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    );
  };

  // Helper count of total match plates
  const totalMatchingPlates = projects.reduce((acc, p) => acc + getProjectPlates(p.id).length, 0) + getProjectPlates(null).length;

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg select-none">
      {/* Header bar */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="font-sans font-bold text-xs tracking-wider text-slate-150 uppercase flex items-center gap-1.5">
            📂 Proyectos e Inventario
          </h2>
          <p className="text-[10px] text-slate-500 mt-0.5">
            {plates.length} placa{plates.length !== 1 ? 's' : ''} en {projects.length} proyecto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="flex items-center space-x-1.5">
          <button
            id="export-csv-btn"
            onClick={exportToCsv}
            disabled={plates.length === 0}
            className={`p-2 border rounded-lg transition shadow-xs ${
              plates.length > 0
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-805 text-cyan-400 hover:text-cyan-300 cursor-pointer'
                : 'bg-slate-950/40 border-slate-900 text-slate-600 cursor-not-allowed opacity-50'
            }`}
            title={plates.length > 0 ? "Exportar catálogo completo a CSV" : "Agrega al menos un equipo al catálogo para exportar a CSV"}
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          
          {plates.length > 0 && (
            <button
              id="clear-all-btn"
              onClick={() => {
                if (window.confirm('¿Seguro que deseas eliminar todos los equipos de todos los proyectos? Esta acción borrará el inventario completo.')) {
                  onClearAll();
                }
              }}
              className="p-2 bg-red-950/20 hover:bg-red-950/50 border border-red-900/30 text-red-400 hover:text-red-300 rounded-lg transition cursor-pointer"
              title="Borrar catálogo completo"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Project Selector & Creation bar */}
      <div className="p-3 bg-slate-950/75 border-b border-slate-800 space-y-2.5 font-sans">
        {/* Active Project Selector */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-[9px] text-slate-450 font-bold uppercase tracking-wider font-mono">
              Proyecto para nuevos escaneos
            </label>
            {activeProjectId && (
              <span className="inline-flex items-center h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </div>
          <select
            id="active-project-select"
            value={activeProjectId || 'unassigned'}
            onChange={(e) => onSetActiveProject(e.target.value === 'unassigned' ? null : e.target.value)}
            className="block w-full px-2.5 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs text-slate-300 focus:outline-none focus:ring-1 focus:ring-cyan-500 font-medium cursor-pointer"
          >
            <option value="unassigned">⚙️ Historial General (Sin Proyecto)</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>📁 {p.name}</option>
            ))}
          </select>
        </div>

        {/* Create New Project Inline Form */}
        <form onSubmit={handleCreateProject} className="flex gap-1.5">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Crear nuevo proyecto (ej. Planta Norte)..."
            className="flex-1 px-2.5 py-1.5 bg-slate-900/50 border border-slate-850/80 rounded-lg text-xs text-slate-355 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder:text-[10px]"
          />
          <button
            type="submit"
            disabled={!newProjectName.trim()}
            className="px-2.5 py-1.5 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition active:scale-95 cursor-pointer flex items-center justify-center font-bold text-xs"
            title="Crear Proyecto"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Filters & Search */}
      <div className="p-3 bg-slate-950/40 border-b border-slate-800 space-y-2">
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
          className="block w-full px-2.5 py-1.5 bg-slate-900 border border-slate-850 rounded-lg text-xs text-slate-400 focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
        >
          <option value="all">Sectores: Todos los Equipos</option>
          <option value="motor">Sectores: Motores SIMOTICS</option>
          <option value="vfd">Sectores: Variadores SINAMICS</option>
          <option value="plc">Sectores: Automatización SIMATIC</option>
          <option value="switchgear">Sectores: Conmutación SIRIUS</option>
          <option value="other">Sectores: Otros</option>
        </select>
      </div>

      {/* Collapsible project folders list */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2.5 max-h-[460px] lg:max-h-none">
        {totalMatchingPlates === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <ChevronDown className="w-8 h-8 text-slate-700 mb-2 rotate-45" />
            <p className="text-xs text-slate-400 font-semibold">Sin coincidencias</p>
            <p className="text-[10px] text-slate-550 mt-1 max-w-[190px]">
              {searchQuery || categoryFilter !== 'all' 
                ? 'Ningún registro coincide con los filtros aplicados en este proyecto.' 
                : 'Crea un proyecto arriba, o selecciona uno para empezar a guardar placas de datos.'}
            </p>
          </div>
        ) : (
          <>
            {/* 1. Projects Folders loop */}
            {projects.map((project) => {
              const projectPlates = getProjectPlates(project.id);
              const isExpanded = expandedProjects[project.id] ?? false;
              const isActive = activeProjectId === project.id;

              return (
                <div key={project.id} className="border border-slate-850 rounded-xl overflow-hidden bg-slate-950/20">
                  {/* Folder Header */}
                  <div 
                    onClick={() => toggleProjectExpand(project.id)}
                    className={`flex items-center justify-between p-2.5 bg-slate-950/40 hover:bg-slate-950 border-b border-slate-900 transition-all cursor-pointer select-none ${
                      isActive ? 'bg-cyan-950/15' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      )}
                      
                      {isExpanded ? (
                        <FolderOpen className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                      ) : (
                        <Folder className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                      )}
                      
                      <div className="truncate leading-tight">
                        <span className="text-xs font-bold text-slate-250 block truncate" title={project.name}>
                          {project.name}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">
                          {projectPlates.length} equipo{projectPlates.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {/* Folder Controls */}
                    <div className="flex items-center space-x-1.5" onClick={e => e.stopPropagation()}>
                      {/* Set Active Project Selector inside Folder header */}
                      <button
                        onClick={() => onSetActiveProject(isActive ? null : project.id)}
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition font-mono ${
                          isActive 
                            ? 'bg-cyan-950/80 text-cyan-400 border border-cyan-500/30' 
                            : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                        title={isActive ? "Este proyecto está activo para escaneos" : "Marcar como proyecto activo"}
                      >
                        {isActive ? '● En Uso' : 'Fijar'}
                      </button>

                      {/* Delete project button */}
                      <button
                        onClick={() => {
                          if (window.confirm(`¿Seguro que deseas eliminar el proyecto "${project.name}"?\nSe conservarán los equipos del catálogo y se moverán a "Equipos sin proyecto".`)) {
                            onDeleteProject(project.id);
                          }
                        }}
                        className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/20 rounded transition"
                        title="Eliminar proyecto y liberar equipos"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Collapsible content (plates list inside project) */}
                  {isExpanded && (
                    <div className="p-2 space-y-1.5 bg-slate-950/20 border-t border-slate-900">
                      {projectPlates.length === 0 ? (
                        <div className="py-3 px-2 text-center text-[10px] text-slate-500 italic leading-snug">
                          No hay equipos asociados aún. Modifica tu proyecto activo a éste y realiza un escaneo para añadirlo aquí.
                        </div>
                      ) : (
                        projectPlates.map(plate => renderPlateItem(plate))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Unassigned Plates folder (always visible if there are unassigned items or if there are no registered projects) */}
            {(() => {
              const unassignedPlates = getProjectPlates(null);
              const isExpanded = expandedProjects['unassigned'] ?? true;
              const isActive = activeProjectId === null;

              if (unassignedPlates.length > 0 || projects.length === 0) {
                return (
                  <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl overflow-hidden bg-slate-950/15">
                    {/* Header */}
                    <div 
                      onClick={() => toggleProjectExpand('unassigned')}
                      className={`flex items-center justify-between p-2.5 bg-slate-950/30 hover:bg-slate-950/60 border-b border-slate-900 transition-all cursor-pointer select-none ${
                        isActive ? 'bg-cyan-950/10' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        )}
                        <Folder className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                        <div className="truncate leading-tight">
                          <span className="text-xs font-bold text-slate-350 block truncate">
                            Equipos sin Proyecto (Historial)
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {unassignedPlates.length} equipo{unassignedPlates.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>

                      <div onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => onSetActiveProject(null)}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase transition font-mono ${
                            isActive 
                              ? 'bg-teal-950/50 text-teal-400 border border-teal-500/20' 
                              : 'bg-slate-900/40 hover:bg-slate-800 text-slate-550 hover:text-slate-300 border border-slate-850'
                          }`}
                          title="Fijar sin proyecto para nuevos escaneos"
                        >
                          {isActive ? '● En Uso' : 'Fijar'}
                        </button>
                      </div>
                    </div>

                    {/* Collapsible list of unassigned items */}
                    {isExpanded && (
                      <div className="p-2 space-y-1.5 bg-slate-950/10 border-t border-slate-900">
                        {unassignedPlates.length === 0 ? (
                          <div className="py-3 px-2 text-center text-[10px] text-slate-500 italic">
                            No hay equipos sin proyecto.
                          </div>
                        ) : (
                          unassignedPlates.map(plate => renderPlateItem(plate))
                        )}
                      </div>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </>
        )}
      </div>

      {/* Visual instructions footer */}
      <div className="p-3 bg-slate-950 border-t border-slate-850 text-[10px] text-slate-555 flex items-center space-x-2">
        <Calendar className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
        <span>Los proyectos y equipos se almacenan de manera local en el navegador (localStorage).</span>
      </div>
    </div>
  );
}
