export type TreeTask = 'riego' | 'poda';

export interface TreePoint {
  id: string;
  nombre: string;
  latitud: number;
  longitud: number;
  codigo_arbol: string;
  especie: string;
  tarea: TreeTask;
  created_at?: string;
}

export interface TreePointInput {
  nombre: string;
  latitud: number;
  longitud: number;
  codigo_arbol: string;
  especie: string;
  tarea: TreeTask;
}

export interface ValidationErrors {
  nombre?: string;
  latitud?: string;
  longitud?: string;
  codigo_arbol?: string;
  especie?: string;
  tarea?: string;
}

export const INITIAL_SEED_POINTS: TreePoint[] = [
  {
    id: '11111111-1111-4111-8111-111111111101',
    nombre: 'Jacarandá del Rosedal',
    latitud: -34.571235,
    longitud: -58.416842,
    codigo_arbol: 'ARB-101',
    especie: 'Jacaranda mimosifolia',
    tarea: 'riego',
    created_at: '2026-11-20T09:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-8222-222222222202',
    nombre: 'Tipa Blanca de Costanera Sur',
    latitud: -34.609412,
    longitud: -58.352671,
    codigo_arbol: 'ARB-204',
    especie: 'Tipuana tipu',
    tarea: 'poda',
    created_at: '2026-11-20T09:15:00.000Z',
  },
  {
    id: '33333333-3333-4333-8333-333333333303',
    nombre: 'Ceibo de Parque Centenario',
    latitud: -34.606428,
    longitud: -58.435714,
    codigo_arbol: 'ARB-309',
    especie: 'Erythrina crista-galli',
    tarea: 'riego',
    created_at: '2026-11-20T09:30:00.000Z',
  },
];

export function validateLatitude(value: unknown): { valid: boolean; numberValue?: number; error?: string } {
  const num = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (String(value).trim() === '' || Number.isNaN(num) || !Number.isFinite(num)) {
    return { valid: false, error: 'Ingresá una latitud válida en grados decimales.' };
  }
  if (num < -90 || num > 90) {
    return { valid: false, error: 'La latitud debe estar entre −90 y 90 grados.' };
  }
  return { valid: true, numberValue: Number(num.toFixed(6)) };
}

export function validateLongitude(value: unknown): { valid: boolean; numberValue?: number; error?: string } {
  const num = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
  if (String(value).trim() === '' || Number.isNaN(num) || !Number.isFinite(num)) {
    return { valid: false, error: 'Ingresá una longitud válida en grados decimales.' };
  }
  if (num < -180 || num > 180) {
    return { valid: false, error: 'La longitud debe estar entre −180 y 180 grados.' };
  }
  return { valid: true, numberValue: Number(num.toFixed(6)) };
}

export function validateTreePointForm(raw: {
  nombre: string;
  latitud: string | number;
  longitud: string | number;
  codigo_arbol: string;
  especie: string;
  tarea: string;
}): { valid: boolean; errors: ValidationErrors; data?: TreePointInput } {
  const errors: ValidationErrors = {};

  const nombre = raw.nombre.trim();
  const codigo_arbol = raw.codigo_arbol.trim();
  const especie = raw.especie.trim();

  if (!nombre) {
    errors.nombre = 'El nombre del punto es obligatorio.';
  } else if (nombre.length > 120) {
    errors.nombre = 'Máximo 120 caracteres.';
  }

  if (!codigo_arbol) {
    errors.codigo_arbol = 'El código de árbol es obligatorio.';
  } else if (codigo_arbol.length > 40) {
    errors.codigo_arbol = 'Máximo 40 caracteres.';
  }

  if (!especie) {
    errors.especie = 'La especie es obligatoria.';
  } else if (especie.length > 120) {
    errors.especie = 'Máximo 120 caracteres.';
  }

  const latCheck = validateLatitude(raw.latitud);
  if (!latCheck.valid) {
    errors.latitud = latCheck.error;
  }

  const lngCheck = validateLongitude(raw.longitud);
  if (!lngCheck.valid) {
    errors.longitud = lngCheck.error;
  }

  if (raw.tarea !== 'riego' && raw.tarea !== 'poda') {
    errors.tarea = 'Seleccioná una tarea válida: riego o poda.';
  }

  if (Object.keys(errors).length > 0 || latCheck.numberValue === undefined || lngCheck.numberValue === undefined) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: {},
    data: {
      nombre,
      latitud: latCheck.numberValue,
      longitud: lngCheck.numberValue,
      codigo_arbol,
      especie,
      tarea: raw.tarea as TreeTask,
    },
  };
}
