-- Guarda o nome da lista do ClickUp, para mostrar no sistema
alter table public.squad_clientes add column if not exists clickup_list_name text;
