import { useState } from 'react';
import { Droplets, Scissors, Pencil, Trash2, Search, Plus, MapPin, Check, X } from 'lucide-react';
import type { TreePoint, TreeTask } from '../types/treePoint.ts';

interface PointsListProps {
  points: TreePoint[];
  totalCount: number;
  riegoCount: number;
  podaCount: number;
  selectedId: string | null;
  taskFilter: 'todas' | TreeTask;
  searchQuery: string;
  isLoading: boolean;
  onTaskFilterChange: (filter: 'todas' | TreeTask) => void;
  onSearchChange: (q: string) => void;
  onSelectPoint: (point: TreePoint) => void;
  onEditPoint: (point: TreePoint) => void;
  onDeletePoint: (id: string) => Promise<void>;
  onOpenNewModal: () => void;
}

export function PointsList({
  points,
  totalCount,
  riegoCount,
  podaCount,
  selectedId,
  taskFilter,
  searchQuery,
  isLoading,
  onTaskFilterChange,
  onSearchChange,
  onSelectPoint,
  onEditPoint,
  onDeletePoint,
  onOpenNewModal,
}: PointsListProps) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleConfirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDeletePoint(id);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <section
      aria-label="Listado de puntos de arbolado"
      className="flex h-full flex-col rounded-xl border border-slate-200 bg-white overflow-hidden"
    >
      <div className="border-b border-slate-200 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-slate-900">
            Puntos registrados
          </h2>
          <span className="font-mono text-xs tabular-nums text-slate-500">
            {points.length} de {totalCount}
          </span>
        </div>

        <div
          role="group"
          aria-label="Filtrar por tarea"
          className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1"
        >
          <button
            type="button"
            onClick={() => onTaskFilterChange('todas')}
            className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              taskFilter === 'todas'
                ? 'bg-white text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todas ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => onTaskFilterChange('riego')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              taskFilter === 'riego'
                ? 'bg-white text-sky-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
            Riego ({riegoCount})
          </button>
          <button
            type="button"
            onClick={() => onTaskFilterChange('poda')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
              taskFilter === 'poda'
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
            Poda ({podaCount})
          </button>
        </div>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, código o especie..."
            aria-label="Buscar puntos por nombre, código o especie"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoading ? (
          <div className="p-4 space-y-3" aria-busy="true" aria-label="Cargando puntos">
            {[1, 2, 3].map((item) => (
              <div key={item} className="animate-pulse space-y-2 py-2">
                <div className="h-4 w-2/3 rounded bg-slate-200" />
                <div className="h-3 w-1/2 rounded bg-slate-100" />
                <div className="h-3 w-1/3 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        ) : points.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
            <MapPin className="h-8 w-8 text-slate-300" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-slate-800">
              No hay puntos que coincidan con el filtro
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Probá cambiando la tarea seleccionada o cargá un nuevo ejemplar.
            </p>
            <button
              type="button"
              onClick={onOpenNewModal}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-800 whitespace-nowrap"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Nuevo punto
            </button>
          </div>
        ) : (
          points.map((point) => {
            const isSelected = point.id === selectedId;
            const isRiego = point.tarea === 'riego';
            const isConfirmingDelete = confirmDeleteId === point.id;

            return (
              <div
                key={point.id}
                className={`group px-4 py-3.5 transition-colors ${
                  isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onSelectPoint(point)}
                    className="min-w-0 flex-1 text-left focus:outline-none"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate font-display text-sm font-semibold ${
                          isSelected ? 'text-emerald-950' : 'text-slate-900'
                        }`}
                      >
                        {point.nombre}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                      <span className="font-mono font-medium text-slate-800">
                        {point.codigo_arbol}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="italic truncate max-w-[180px]">{point.especie}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={`inline-flex items-center gap-1 font-medium ${
                          isRiego ? 'text-sky-700' : 'text-amber-700'
                        }`}
                      >
                        {isRiego ? (
                          <Droplets className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <Scissors className="h-3 w-3" aria-hidden="true" />
                        )}
                        {isRiego ? 'Riego' : 'Poda'}
                      </span>
                    </div>

                    <div className="mt-1.5 font-mono text-[11px] tabular-nums text-slate-500">
                      {point.latitud.toFixed(6)}, {point.longitud.toFixed(6)}
                    </div>
                  </button>

                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleConfirmDelete(point.id)}
                          disabled={deletingId === point.id}
                          aria-label={`Confirmar eliminación de ${point.nombre}`}
                          className="inline-flex h-8 items-center gap-1 rounded-md bg-red-600 px-2 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          Borrar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          aria-label="Cancelar eliminación"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        >
                          <X className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => onEditPoint(point)}
                          aria-label={`Editar ${point.nombre}`}
                          title="Editar punto"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-200/70 hover:text-slate-900"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(point.id)}
                          aria-label={`Eliminar ${point.nombre}`}
                          title="Eliminar punto"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
