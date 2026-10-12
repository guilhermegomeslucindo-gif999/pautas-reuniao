-- Lista de lembretes de cada cliente (área "Lembretes" do sistema)
alter table public.squad_clientes add column if not exists lembretes jsonb not null default '[]'::jsonb;
