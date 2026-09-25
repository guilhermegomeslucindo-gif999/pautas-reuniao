-- Tabelas do sistema de reuniões do Squad D
-- Rode este arquivo no SQL Editor do Supabase se precisar recriar o banco do zero.

create table if not exists public.squad_clientes (
  id text primary key default gen_random_uuid()::text,
  nome text not null,
  ordem integer not null default 0,
  squad text not null default 'D',
  criado_em timestamptz not null default now()
);

create table if not exists public.squad_reunioes (
  id text primary key default gen_random_uuid()::text,
  cliente_id text not null references public.squad_clientes(id) on delete cascade,
  data date,
  assunto text not null default '',
  pautas text not null default '',
  acoes jsonb not null default '[]'::jsonb,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists squad_reunioes_cliente_idx on public.squad_reunioes(cliente_id);

create or replace function public.squad_set_atualizado_em()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists squad_reunioes_atualizado on public.squad_reunioes;
create trigger squad_reunioes_atualizado before update on public.squad_reunioes
for each row execute function public.squad_set_atualizado_em();

alter table public.squad_clientes enable row level security;
alter table public.squad_reunioes enable row level security;

-- ATENÇÃO: acesso aberto para quem tiver o link do sistema (sem login).
create policy "acesso publico clientes" on public.squad_clientes
  for all to anon, authenticated using (true) with check (true);
create policy "acesso publico reunioes" on public.squad_reunioes
  for all to anon, authenticated using (true) with check (true);

-- Atualização em tempo real entre quem estiver com o sistema aberto
alter publication supabase_realtime add table public.squad_clientes;
alter publication supabase_realtime add table public.squad_reunioes;
