-- Tabla principal de puntos de arbolado en Supabase
create extension if not exists "pgcrypto";

create table if not exists public.tree_points (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(trim(nombre)) > 0),
  latitud double precision not null check (latitud >= -90 and latitud <= 90),
  longitud double precision not null check (longitud >= -180 and longitud <= 180),
  codigo_arbol text not null check (char_length(trim(codigo_arbol)) > 0),
  especie text not null check (char_length(trim(especie)) > 0),
  tarea text not null check (tarea in ('riego', 'poda')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tree_points_tarea on public.tree_points (tarea);

alter table public.tree_points enable row level security;

-- Política para acceso desde la aplicación web (ajustar según autenticación en producción)
drop policy if exists "Permitir lectura pública de tree_points" on public.tree_points;
create policy "Permitir lectura pública de tree_points"
  on public.tree_points for select
  using (true);

drop policy if exists "Permitir inserción en tree_points" on public.tree_points;
create policy "Permitir inserción en tree_points"
  on public.tree_points for insert
  with check (true);

drop policy if exists "Permitir actualización en tree_points" on public.tree_points;
create policy "Permitir actualización en tree_points"
  on public.tree_points for update
  using (true)
  with check (true);

drop policy if exists "Permitir eliminación en tree_points" on public.tree_points;
create policy "Permitir eliminación en tree_points"
  on public.tree_points for delete
  using (true);

-- Tres ejemplos iniciales en ubicaciones distintas (grados decimales)
insert into public.tree_points (nombre, latitud, longitud, codigo_arbol, especie, tarea)
values
  ('Jacarandá del Rosedal', -34.571235, -58.416842, 'ARB-101', 'Jacaranda mimosifolia', 'riego'),
  ('Tipa Blanca de Costanera Sur', -34.609412, -58.352671, 'ARB-204', 'Tipuana tipu', 'poda'),
  ('Ceibo de Parque Centenario', -34.606428, -58.435714, 'ARB-309', 'Erythrina crista-galli', 'riego');
