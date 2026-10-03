-- Guarda, para cada cliente, o ID da lista do ClickUp que recebe as tarefas
alter table public.squad_clientes add column if not exists clickup_list_id text;
