import { useEffect, useCallback } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
  useApiLoadingStatus,
  APILoadingStatus,
  useAdvancedMarkerRef,
  type MapMouseEvent,
} from '@vis.gl/react-google-maps';
import { Droplets, Scissors, Maximize2, Crosshair, MapPin } from 'lucide-react';
import type { TreePoint } from '../types/treePoint.ts';

interface TreeMapViewProps {
  points: TreePoint[];
  selectedPoint: TreePoint | null;
  onSelectPoint: (point: TreePoint) => void;
  isPickingCoordinates: boolean;
  pickedCoords: { lat: number; lng: number } | null;
  onPickCoordinates: (coords: { lat: number; lng: number }) => void;
  onTogglePickCoordinates: () => void;
}

const DEFAULT_CENTER = { lat: -34.595, lng: -58.405 };
const DEFAULT_ZOOM = 12;

interface TreeMarkerItemProps {
  point: TreePoint;
  isSelected: boolean;
  onSelect: (point: TreePoint) => void;
}

function TreeMarkerItem({ point, isSelected, onSelect }: TreeMarkerItemProps) {
  const [markerRef, marker] = useAdvancedMarkerRef();

  const isRiego = point.tarea === 'riego';
  const pinBackground = isSelected
    ? isRiego
      ? '#0369A1'
      : '#B45309'
    : isRiego
      ? '#0EA5E9'
      : '#D97706';
  const pinBorder = isSelected ? '#0F172A' : isRiego ? '#0369A1' : '#92400E';

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={{ lat: point.latitud, lng: point.longitud }}
        title={point.nombre}
        zIndex={isSelected ? 50 : 10}
        onClick={() => onSelect(point)}
      >
        <Pin
          background={pinBackground}
          borderColor={pinBorder}
          glyphColor="#FFFFFF"
          scale={isSelected ? 1.3 : 1.0}
        />
      </AdvancedMarker>

      {isSelected && marker && (
        <InfoWindow anchor={marker} maxWidth={280} headerDisabled>
          <div className="p-1 text-slate-900">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-display text-sm font-semibold text-slate-950 leading-snug">
                {point.nombre}
              </h4>
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-mono font-medium text-slate-800">{point.codigo_arbol}</span>
              <span aria-hidden="true">·</span>
              <span className="italic truncate">{point.especie}</span>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 border-t border-slate-100 pt-2 text-xs">
              <span
                className={`inline-flex items-center gap-1 font-medium ${
                  isRiego ? 'text-sky-700' : 'text-amber-700'
                }`}
              >
                {isRiego ? (
                  <Droplets className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Scissors className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                {isRiego ? 'Riego' : 'Poda'}
              </span>
              <span className="font-mono tabular-nums text-[11px] text-slate-500">
                {point.latitud.toFixed(6)}, {point.longitud.toFixed(6)}
              </span>
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

function MapViewportController({
  points,
  selectedPoint,
}: {
  points: TreePoint[];
  selectedPoint: TreePoint | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || !selectedPoint) return;
    map.panTo({ lat: selectedPoint.latitud, lng: selectedPoint.longitud });
    const currentZoom = map.getZoom() ?? DEFAULT_ZOOM;
    if (currentZoom < 15) {
      map.setZoom(15);
    }
  }, [map, selectedPoint]);

  const handleFitAll = useCallback(() => {
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.panTo({ lat: points[0].latitud, lng: points[0].longitud });
      map.setZoom(15);
      return;
    }
    let north = -90;
    let south = 90;
    let east = -180;
    let west = 180;
    for (const pt of points) {
      if (pt.latitud > north) north = pt.latitud;
      if (pt.latitud < south) south = pt.latitud;
      if (pt.longitud > east) east = pt.longitud;
      if (pt.longitud < west) west = pt.longitud;
    }
    map.fitBounds({ north, south, east, west }, 56);
  }, [map, points]);

  return (
    <button
      type="button"
      onClick={handleFitAll}
      disabled={points.length === 0}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm transition-colors hover:bg-slate-50 hover:text-slate-950 disabled:opacity-40 whitespace-nowrap shrink-0"
      title="Ajustar vista a todos los puntos visibles"
    >
      <Maximize2 className="h-3.5 w-3.5" aria-hidden="true" />
      Ver todos
    </button>
  );
}

export function TreeMapView({
  points,
  selectedPoint,
  onSelectPoint,
  isPickingCoordinates,
  pickedCoords,
  onPickCoordinates,
  onTogglePickCoordinates,
}: TreeMapViewProps) {
  const loadingStatus = useApiLoadingStatus();

  const handleMapClick = useCallback(
    (ev: MapMouseEvent) => {
      if (!isPickingCoordinates || !ev.detail.latLng) return;
      onPickCoordinates({
        lat: Number(ev.detail.latLng.lat.toFixed(6)),
        lng: Number(ev.detail.latLng.lng.toFixed(6)),
      });
    },
    [isPickingCoordinates, onPickCoordinates]
  );

  if (loadingStatus === APILoadingStatus.AUTH_FAILURE || loadingStatus === APILoadingStatus.FAILED) {
    return (
      <div className="flex h-full min-h-[480px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 p-8 text-center">
        <MapPin className="h-9 w-9 text-slate-400" aria-hidden="true" />
        <h3 className="mt-3 font-display text-base font-semibold text-slate-900">
          No se pudo cargar Google Maps
        </h3>
        <p className="mt-1 max-w-md text-sm text-slate-600">
          Verificá la clave de API o la conexión de red e intentá nuevamente.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[480px] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-1.5 shadow-sm backdrop-blur-sm">
          {selectedPoint ? (
            <>
              <span
                className={`h-2 w-2 rounded-full ${
                  selectedPoint.tarea === 'riego' ? 'bg-sky-600' : 'bg-amber-600'
                }`}
                aria-hidden="true"
              />
              <span className="text-xs font-semibold text-slate-900 truncate max-w-[220px]">
                {selectedPoint.nombre}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                |
              </span>
              <span className="font-mono text-[11px] tabular-nums text-slate-600">
                {selectedPoint.latitud.toFixed(6)}, {selectedPoint.longitud.toFixed(6)}
              </span>
            </>
          ) : (
            <span className="text-xs text-slate-600">
              Seleccioná un árbol de la lista o un marcador en el mapa
            </span>
          )}
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePickCoordinates}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-sm transition-colors whitespace-nowrap shrink-0 ${
              isPickingCoordinates
                ? 'border-emerald-700 bg-emerald-700 text-white'
                : 'border-slate-200 bg-white/95 text-slate-700 hover:bg-slate-50 hover:text-slate-950'
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />
            {isPickingCoordinates ? 'Hacé clic en el mapa...' : 'Marcar punto en mapa'}
          </button>
          <MapViewportController points={points} selectedPoint={selectedPoint} />
        </div>
      </div>

      <GoogleMap
        mapId="DEMO_MAP_ID"
        internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
        defaultCenter={DEFAULT_CENTER}
        defaultZoom={DEFAULT_ZOOM}
        gestureHandling="greedy"
        mapTypeControl={false}
        streetViewControl={false}
        fullscreenControl={true}
        onClick={handleMapClick}
        style={{ width: '100%', height: '100%' }}
      >
        {points.map((point) => (
          <TreeMarkerItem
            key={point.id}
            point={point}
            isSelected={selectedPoint?.id === point.id}
            onSelect={onSelectPoint}
          />
        ))}

        {pickedCoords && (
          <AdvancedMarker position={pickedCoords} title="Nueva ubicación seleccionada">
            <Pin background="#15803D" borderColor="#052E16" glyphColor="#FFFFFF" scale={1.15} />
          </AdvancedMarker>
        )}
      </GoogleMap>
    </div>
  );
}
