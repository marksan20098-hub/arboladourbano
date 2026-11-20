import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  INITIAL_SEED_POINTS,
  validateTreePointForm,
  type TreePoint,
  type TreeTask,
} from './src/types/treePoint.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'tree_points.json');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

function ensureLocalStore(): TreePoint[] {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_SEED_POINTS, null, 2), 'utf-8');
    return [...INITIAL_SEED_POINTS];
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as TreePoint[];
    }
  } catch {
    // Fallback to initial seed if file is corrupted
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(INITIAL_SEED_POINTS, null, 2), 'utf-8');
  return [...INITIAL_SEED_POINTS];
}

function saveLocalStore(points: TreePoint[]): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(points, null, 2), 'utf-8');
}

async function listPoints(tareaFilter?: string): Promise<TreePoint[]> {
  if (supabase) {
    let query = supabase
      .from('tree_points')
      .select('id, nombre, latitud, longitud, codigo_arbol, especie, tarea, created_at')
      .order('created_at', { ascending: false });

    if (tareaFilter === 'riego' || tareaFilter === 'poda') {
      query = query.eq('tarea', tareaFilter);
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Error al leer Supabase: ${error.message}`);
    }

    // Seed initial 3 points into Supabase if table is empty on first run
    if ((!data || data.length === 0) && !tareaFilter) {
      const seedPayload = INITIAL_SEED_POINTS.map(({ nombre, latitud, longitud, codigo_arbol, especie, tarea }) => ({
        nombre,
        latitud,
        longitud,
        codigo_arbol,
        especie,
        tarea,
      }));
      const { data: inserted, error: seedError } = await supabase
        .from('tree_points')
        .insert(seedPayload)
        .select('id, nombre, latitud, longitud, codigo_arbol, especie, tarea, created_at');

      if (!seedError && inserted) {
        return inserted as TreePoint[];
      }
    }

    return (data || []) as TreePoint[];
  }

  const points = ensureLocalStore();
  if (tareaFilter === 'riego' || tareaFilter === 'poda') {
    return points.filter((p) => p.tarea === tareaFilter);
  }
  return points;
}

async function createPoint(payload: {
  nombre: string;
  latitud: number;
  longitud: number;
  codigo_arbol: string;
  especie: string;
  tarea: TreeTask;
}): Promise<TreePoint> {
  if (supabase) {
    const { data, error } = await supabase
      .from('tree_points')
      .insert([payload])
      .select('id, nombre, latitud, longitud, codigo_arbol, especie, tarea, created_at')
      .single();

    if (error) {
      throw new Error(`Error al guardar en Supabase: ${error.message}`);
    }
    return data as TreePoint;
  }

  const points = ensureLocalStore();
  const created: TreePoint = {
    id: crypto.randomUUID(),
    ...payload,
    created_at: new Date().toISOString(),
  };
  points.unshift(created);
  saveLocalStore(points);
  return created;
}

async function updatePoint(
  id: string,
  payload: {
    nombre: string;
    latitud: number;
    longitud: number;
    codigo_arbol: string;
    especie: string;
    tarea: TreeTask;
  }
): Promise<TreePoint | null> {
  if (supabase) {
    const { data, error } = await supabase
      .from('tree_points')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select('id, nombre, latitud, longitud, codigo_arbol, especie, tarea, created_at')
      .maybeSingle();

    if (error) {
      throw new Error(`Error al actualizar en Supabase: ${error.message}`);
    }
    return (data as TreePoint | null) ?? null;
  }

  const points = ensureLocalStore();
  const index = points.findIndex((p) => p.id === id);
  if (index === -1) {
    return null;
  }
  const updated: TreePoint = {
    ...points[index],
    ...payload,
  };
  points[index] = updated;
  saveLocalStore(points);
  return updated;
}

async function deletePoint(id: string): Promise<boolean> {
  if (supabase) {
    const { error, count } = await supabase
      .from('tree_points')
      .delete({ count: 'exact' })
      .eq('id', id);

    if (error) {
      throw new Error(`Error al eliminar en Supabase: ${error.message}`);
    }
    return (count ?? 1) > 0;
  }

  const points = ensureLocalStore();
  const next = points.filter((p) => p.id !== id);
  if (next.length === points.length) {
    return false;
  }
  saveLocalStore(next);
  return true;
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/config', (_req, res) => {
    const googleMapsApiKey =
      process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';
    res.json({
      googleMapsApiKey,
      backendProvider: supabase ? 'supabase' : 'local',
    });
  });

  app.get('/api/points', async (req, res) => {
    try {
      const tarea = typeof req.query.tarea === 'string' ? req.query.tarea : undefined;
      const points = await listPoints(tarea);
      res.json({ points });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al obtener los puntos.';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/points', async (req, res) => {
    try {
      const body = req.body || {};
      const validation = validateTreePointForm({
        nombre: String(body.nombre ?? ''),
        latitud: body.latitud ?? '',
        longitud: body.longitud ?? '',
        codigo_arbol: String(body.codigo_arbol ?? ''),
        especie: String(body.especie ?? ''),
        tarea: String(body.tarea ?? ''),
      });

      if (!validation.valid || !validation.data) {
        return res.status(400).json({
          error: 'Datos inválidos. Revisá los campos y el rango de coordenadas.',
          errors: validation.errors,
        });
      }

      const created = await createPoint(validation.data);
      return res.status(201).json({ point: created });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al crear el punto.';
      return res.status(500).json({ error: message });
    }
  });

  app.put('/api/points/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};
      const validation = validateTreePointForm({
        nombre: String(body.nombre ?? ''),
        latitud: body.latitud ?? '',
        longitud: body.longitud ?? '',
        codigo_arbol: String(body.codigo_arbol ?? ''),
        especie: String(body.especie ?? ''),
        tarea: String(body.tarea ?? ''),
      });

      if (!validation.valid || !validation.data) {
        return res.status(400).json({
          error: 'Datos inválidos. Revisá los campos y el rango de coordenadas.',
          errors: validation.errors,
        });
      }

      const updated = await updatePoint(id, validation.data);
      if (!updated) {
        return res.status(404).json({ error: 'Punto no encontrado.' });
      }
      return res.json({ point: updated });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al actualizar el punto.';
      return res.status(500).json({ error: message });
    }
  });

  app.delete('/api/points/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const removed = await deletePoint(id);
      if (!removed) {
        return res.status(404).json({ error: 'Punto no encontrado.' });
      }
      return res.json({ deleted: true, id });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error al eliminar el punto.';
      return res.status(500).json({ error: message });
    }
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
