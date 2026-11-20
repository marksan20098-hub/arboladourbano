import { useState, useEffect, type FormEvent } from 'react';
import { X, Droplets, Scissors, Crosshair } from 'lucide-react';
import {
  validateLatitude,
  validateLongitude,
  validateTreePointForm,
  type TreePoint,
  type TreePointInput,
  type TreeTask,
  type ValidationErrors,
} from '../types/treePoint.ts';

interface PointFormModalProps {
  isOpen: boolean;
  editingPoint: TreePoint | null;
  pickedCoords: { lat: number; lng: number } | null;
  onClose: () => void;
  onRequestMapPick: () => void;
  onSubmit: (data: TreePointInput, editingId?: string) => Promise<void>;
}

export function PointFormModal({
  isOpen,
  editingPoint,
  pickedCoords,
  onClose,
  onRequestMapPick,
  onSubmit,
}: PointFormModalProps) {
  const [nombre, setNombre] = useState('');
  const [codigoArbol, setCodigoArbol] = useState('');
  const [especie, setEspecie] = useState('');
  const [tarea, setTarea] = useState<TreeTask>('riego');
  const [latitud, setLatitud] = useState('');
  const [longitud, setLongitud] = useState('');
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (editingPoint) {
      setNombre(editingPoint.nombre);
      setCodigoArbol(editingPoint.codigo_arbol);
      setEspecie(editingPoint.especie);
      setTarea(editingPoint.tarea);
      setLatitud(String(editingPoint.latitud));
      setLongitud(String(editingPoint.longitud));
    } else {
      setNombre('');
      setCodigoArbol('');
      setEspecie('');
      setTarea('riego');
      setLatitud('');
      setLongitud('');
    }
    setErrors({});
    setSubmitError(null);
  }, [isOpen, editingPoint]);

  useEffect(() => {
    if (pickedCoords) {
      setLatitud(String(pickedCoords.lat));
      setLongitud(String(pickedCoords.lng));
      setErrors((prev) => ({ ...prev, latitud: undefined, longitud: undefined }));
    }
  }, [pickedCoords]);

  if (!isOpen) return null;

  const handleLatBlur = () => {
    if (!latitud.trim()) return;
    const res = validateLatitude(latitud);
    setErrors((prev) => ({ ...prev, latitud: res.valid ? undefined : res.error }));
  };

  const handleLngBlur = () => {
    if (!longitud.trim()) return;
    const res = validateLongitude(longitud);
    setErrors((prev) => ({ ...prev, longitud: res.valid ? undefined : res.error }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const validation = validateTreePointForm({
      nombre,
      latitud,
      longitud,
      codigo_arbol: codigoArbol,
      especie,
      tarea,
    });

    if (!validation.valid || !validation.data) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsSaving(true);
    try {
      await onSubmit(validation.data, editingPoint?.id);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'No se pudo guardar el punto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="point-modal-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 id="point-modal-title" className="font-display text-lg font-semibold text-slate-900">
            {editingPoint ? 'Editar punto de arbolado' : 'Nuevo punto de arbolado'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
          {submitError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-800"
            >
              {submitError}
            </div>
          )}

          <div>
            <label htmlFor="nombre-punto" className="block text-xs font-medium text-slate-700">
              Nombre del punto
            </label>
            <input
              id="nombre-punto"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej. Jacarandá del Rosedal"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
            />
            {errors.nombre && <p className="mt-1 text-xs text-red-600">{errors.nombre}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="codigo-arbol" className="block text-xs font-medium text-slate-700">
                Código de árbol
              </label>
              <input
                id="codigo-arbol"
                type="text"
                value={codigoArbol}
                onChange={(e) => setCodigoArbol(e.target.value)}
                placeholder="Ej. ARB-104"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
              />
              {errors.codigo_arbol && (
                <p className="mt-1 text-xs text-red-600">{errors.codigo_arbol}</p>
              )}
            </div>

            <div>
              <label htmlFor="especie-arbol" className="block text-xs font-medium text-slate-700">
                Especie
              </label>
              <input
                id="especie-arbol"
                type="text"
                value={especie}
                onChange={(e) => setEspecie(e.target.value)}
                placeholder="Ej. Jacaranda mimosifolia"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
              />
              {errors.especie && <p className="mt-1 text-xs text-red-600">{errors.especie}</p>}
            </div>
          </div>

          <div>
            <span className="block text-xs font-medium text-slate-700">Tarea asignada</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTarea('riego')}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  tarea === 'riego'
                    ? 'border-sky-600 bg-sky-50 text-sky-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Droplets className="h-4 w-4 text-sky-600" aria-hidden="true" />
                Riego
              </button>
              <button
                type="button"
                onClick={() => setTarea('poda')}
                className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                  tarea === 'poda'
                    ? 'border-amber-600 bg-amber-50 text-amber-900'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Scissors className="h-4 w-4 text-amber-600" aria-hidden="true" />
                Poda
              </button>
            </div>
            {errors.tarea && <p className="mt-1 text-xs text-red-600">{errors.tarea}</p>}
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800">
                Coordenadas (grados decimales)
              </span>
              <button
                type="button"
                onClick={onRequestMapPick}
                className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50 transition-colors"
              >
                <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
                Elegir en el mapa
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="latitud-input" className="block text-xs font-medium text-slate-700">
                  Latitud (−90 a 90)
                </label>
                <input
                  id="latitud-input"
                  type="number"
                  step="any"
                  min={-90}
                  max={90}
                  value={latitud}
                  onChange={(e) => setLatitud(e.target.value)}
                  onBlur={handleLatBlur}
                  placeholder="-34.571235"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                />
                {errors.latitud && <p className="mt-1 text-xs text-red-600">{errors.latitud}</p>}
              </div>

              <div>
                <label htmlFor="longitud-input" className="block text-xs font-medium text-slate-700">
                  Longitud (−180 a 180)
                </label>
                <input
                  id="longitud-input"
                  type="number"
                  step="any"
                  min={-180}
                  max={180}
                  value={longitud}
                  onChange={(e) => setLongitud(e.target.value)}
                  onBlur={handleLngBlur}
                  placeholder="-58.416842"
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm tabular-nums text-slate-900 placeholder:text-slate-400 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/15"
                />
                {errors.longitud && <p className="mt-1 text-xs text-red-600">{errors.longitud}</p>}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : editingPoint ? 'Guardar cambios' : 'Agregar punto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
