import { useState, useEffect, useMemo, useCallback } from 'react';
import { APIProvider } from '@vis.gl/react-google-maps';
import { Plus, Droplets, Scissors, MapPin, AlertCircle } from 'lucide-react';
import { PointsList } from './components/PointsList.tsx';
import { TreeMapView } from './components/TreeMapView.tsx';
import { PointFormModal } from './components/PointFormModal.tsx';
import type { TreePoint, TreePointInput, TreeTask } from './types/treePoint.ts';

export default function App() {
  const [points, setPoints] = useState<TreePoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [taskFilter, setTaskFilter] = useState<'todas' | TreeTask>('todas');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [mapsApiKey, setMapsApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
  );
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPoint, setEditingPoint] = useState<TreePoint | null>(null);
  const [isPickingCoordinates, setIsPickingCoordinates] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  useEffect(() => {
    if (!mapsApiKey) {
      fetch('/api/config')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.googleMapsApiKey) {
            setMapsApiKey(data.googleMapsApiKey);
          }
        })
        .catch(() => {
          // Handled cleanly if key is unavailable
        });
    }
  }, [mapsApiKey]);

  const loadPoints = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch('/api/points');
      if (!response.ok) {
        throw new Error('No se pudieron cargar los puntos registrados.');
      }
      const data = await response.json();
      const loaded: TreePoint[] = Array.isArray(data.points) ? data.points : [];
      setPoints(loaded);
      setSelectedId((prev) => {
        if (prev && loaded.some((p) => p.id === prev)) return prev;
        return loaded[0]?.id ?? null;
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : 'Error al cargar los datos.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPoints();
  }, [loadPoints]);

  const riegoCount = useMemo(() => points.filter((p) => p.tarea === 'riego').length, [points]);
  const podaCount = useMemo(() => points.filter((p) => p.tarea === 'poda').length, [points]);

  const filteredPoints = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return points.filter((point) => {
      if (taskFilter !== 'todas' && point.tarea !== taskFilter) return false;
      if (!q) return true;
      return (
        point.nombre.toLowerCase().includes(q) ||
        point.codigo_arbol.toLowerCase().includes(q) ||
        point.especie.toLowerCase().includes(q)
      );
    });
  }, [points, taskFilter, searchQuery]);

  const selectedPoint = useMemo(
    () => points.find((p) => p.id === selectedId) ?? null,
    [points, selectedId]
  );

  const handleOpenNew = () => {
    setEditingPoint(null);
    setPickedCoords(null);
    setIsPickingCoordinates(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (point: TreePoint) => {
    setEditingPoint(point);
    setPickedCoords(null);
    setIsPickingCoordinates(false);
    setIsModalOpen(true);
  };

  const handleRequestMapPick = () => {
    setIsModalOpen(false);
    setIsPickingCoordinates(true);
  };

  const handlePickCoordinatesFromMap = (coords: { lat: number; lng: number }) => {
    setPickedCoords(coords);
    setIsPickingCoordinates(false);
    setIsModalOpen(true);
  };

  const handleTogglePickCoordinates = () => {
    setIsPickingCoordinates((prev) => !prev);
  };

  const handleSubmitForm = async (data: TreePointInput, editingId?: string) => {
    const url = editingId ? `/api/points/${encodeURIComponent(editingId)}` : '/api/points';
    const method = editingId ? 'PUT' : 'POST';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'No se pudo guardar el punto.');
    }

    const savedPoint: TreePoint = result.point;
    setPoints((prev) => {
      if (editingId) {
        return prev.map((item) => (item.id === editingId ? savedPoint : item));
      }
      return [savedPoint, ...prev];
    });
    setSelectedId(savedPoint.id);
    setPickedCoords(null);
  };

  const handleDeletePoint = async (id: string) => {
    const response = await fetch(`/api/points/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setFetchError(result.error || 'No se pudo eliminar el punto.');
      return;
    }

    setPoints((prev) => {
      const remaining = prev.filter((p) => p.id !== id);
      if (selectedId === id) {
        setSelectedId(remaining[0]?.id ?? null);
      }
      return remaining;
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      <header className="flex items-center justify-between gap-8 border-b border-slate-200 bg-white px-6 py-3.5">
        <a
          href="/"
          className="font-display text-lg font-bold tracking-tight text-slate-950 whitespace-nowrap shrink-0"
        >
          ArboMap
        </a>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setTaskFilter('todas')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              taskFilter === 'todas' ? 'text-slate-950 underline underline-offset-4' : 'hover:text-slate-900'
            }`}
          >
            Todos los puntos
          </button>
          <button
            type="button"
            onClick={() => setTaskFilter('riego')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              taskFilter === 'riego' ? 'text-sky-800 underline underline-offset-4' : 'hover:text-slate-900'
            }`}
          >
            Riego
          </button>
          <button
            type="button"
            onClick={() => setTaskFilter('poda')}
            className={`transition-colors whitespace-nowrap shrink-0 ${
              taskFilter === 'poda' ? 'text-amber-800 underline underline-offset-4' : 'hover:text-slate-900'
            }`}
          >
            Poda
          </button>
        </nav>

        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={handleOpenNew}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo punto
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 md:p-6 flex flex-col gap-4">
        {fetchError && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{fetchError}</span>
            </div>
            <button
              type="button"
              onClick={loadPoints}
              className="text-xs font-semibold underline hover:no-underline whitespace-nowrap"
            >
              Reintentar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:h-[calc(100vh-128px)] lg:min-h-[600px]">
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col min-h-[420px] lg:min-h-0">
            <PointsList
              points={filteredPoints}
              totalCount={points.length}
              riegoCount={riegoCount}
              podaCount={podaCount}
              selectedId={selectedId}
              taskFilter={taskFilter}
              searchQuery={searchQuery}
              isLoading={isLoading}
              onTaskFilterChange={setTaskFilter}
              onSearchChange={setSearchQuery}
              onSelectPoint={(pt) => setSelectedId(pt.id)}
              onEditPoint={handleOpenEdit}
              onDeletePoint={handleDeletePoint}
              onOpenNewModal={handleOpenNew}
            />
          </div>

          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-3 min-h-[500px] lg:min-h-0">
            <div className="flex-1 min-h-[440px]">
              {mapsApiKey ? (
                <APIProvider apiKey={mapsApiKey} libraries={['marker']} language="es" region="AR">
                  <TreeMapView
                    points={filteredPoints}
                    selectedPoint={selectedPoint}
                    onSelectPoint={(pt) => setSelectedId(pt.id)}
                    isPickingCoordinates={isPickingCoordinates}
                    pickedCoords={pickedCoords}
                    onPickCoordinates={handlePickCoordinatesFromMap}
                    onTogglePickCoordinates={handleTogglePickCoordinates}
                  />
                </APIProvider>
              ) : (
                <div className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-white p-8 text-center">
                  <MapPin className="h-9 w-9 text-slate-300" aria-hidden="true" />
                  <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
                    Mapa en espera de configuración
                  </h3>
                  <p className="mt-1 max-w-md text-sm text-slate-600">
                    Definí <code className="font-mono text-xs">VITE_GOOGLE_MAPS_API_KEY</code> en
                    el entorno para visualizar los marcadores interactivos.
                  </p>
                </div>
              )}
            </div>

            {selectedPoint && (
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-medium text-slate-800">
                      {selectedPoint.codigo_arbol}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="italic truncate">{selectedPoint.especie}</span>
                    <span aria-hidden="true">·</span>
                    <span
                      className={`inline-flex items-center gap-1 font-medium ${
                        selectedPoint.tarea === 'riego' ? 'text-sky-700' : 'text-amber-700'
                      }`}
                    >
                      {selectedPoint.tarea === 'riego' ? (
                        <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {selectedPoint.tarea === 'riego' ? 'Riego' : 'Poda'}
                    </span>
                  </div>
                  <h3 className="mt-0.5 font-display text-sm font-semibold text-slate-950 truncate">
                    {selectedPoint.nombre}
                  </h3>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="block text-[11px] text-slate-500">
                      Coordenadas decimales
                    </span>
                    <span className="font-mono text-xs font-medium tabular-nums text-slate-800">
                      {selectedPoint.latitud.toFixed(6)}, {selectedPoint.longitud.toFixed(6)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(selectedPoint)}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap"
                  >
                    Editar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <PointFormModal
        isOpen={isModalOpen}
        editingPoint={editingPoint}
        pickedCoords={pickedCoords}
        onClose={() => setIsModalOpen(false)}
        onRequestMapPick={handleRequestMapPick}
        onSubmit={handleSubmitForm}
      />
    </div>
  );
}
