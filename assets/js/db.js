// Camada de dados: toda conversa com o banco (Supabase) passa por aqui.
// O resto do sistema usa só as funções de window.DB.
(function () {
  const cfg = window.APP_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
  const T_CLIENTES = 'squad_clientes';
  const T_REUNIOES = 'squad_reunioes';

  const toClient = r => ({ id: r.id, name: r.nome, order: r.ordem, squad: r.squad, clickupListId: r.clickup_list_id || '', clickupListName: r.clickup_list_name || '' });
  const toMeeting = r => ({
    id: r.id, clientId: r.cliente_id, date: r.data || '', title: r.assunto || '',
    pautas: r.pautas || '', acoes: Array.isArray(r.acoes) ? r.acoes : [],
    createdAt: r.criado_em ? Date.parse(r.criado_em) : 0
  });
  const meetingPatch = p => {
    const o = {};
    if ('date' in p) o.data = p.date || null;
    if ('title' in p) o.assunto = p.title;
    if ('pautas' in p) o.pautas = p.pautas;
    if ('acoes' in p) o.acoes = p.acoes;
    return o;
  };
  const check = ({ data, error }) => { if (error) throw error; return data; };
  async function callApi(path, body, fallback) {
    let r;
    try {
      r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } catch (e) { throw new Error('Sem conexão com o servidor. Tente de novo.'); }
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (r.ok) return j;
    if (j.error) throw new Error(j.error);
    throw new Error(r.status === 404 ? 'A integração com o ClickUp só funciona no endereço publicado na Vercel.' : fallback);
  }

  window.DB = {
    async listClients() {
      return check(await sb.from(T_CLIENTES).select('*').eq('squad', cfg.SQUAD).order('ordem').order('nome')).map(toClient);
    },
    async listMeetings() {
      const ids = (await this.listClients()).map(c => c.id);
      if (!ids.length) return [];
      return check(await sb.from(T_REUNIOES).select('*').in('cliente_id', ids)).map(toMeeting);
    },
    async addClient(name, order) {
      return toClient(check(await sb.from(T_CLIENTES).insert({ nome: name, ordem: order, squad: cfg.SQUAD }).select().single()));
    },
    async renameClient(id, name) {
      check(await sb.from(T_CLIENTES).update({ nome: name }).eq('id', id));
    },
    // Guarda qual lista do ClickUp recebe as tarefas deste cliente
    async setClickupList(id, listId, listName) {
      check(await sb.from(T_CLIENTES).update({ clickup_list_id: listId || null, clickup_list_name: listName || null }).eq('id', id));
    },
    // Pergunta ao ClickUp (pela função da Vercel) qual lista está por trás do link colado
    async resolveList(link) {
      return callApi('/api/clickup-list', { link }, 'Não foi possível conferir a lista no ClickUp.');
    },
    // Cria uma tarefa no ClickUp pela função da Vercel (api/clickup-task.js),
    // que guarda a chave do ClickUp em segredo
    async pushTask(body) {
      return callApi('/api/clickup-task', body, 'Não foi possível criar a tarefa no ClickUp.');
    },
    // Apaga o cliente e, junto, todas as reuniões dele (on delete cascade no banco)
    async deleteClient(id) {
      check(await sb.from(T_CLIENTES).delete().eq('id', id));
    },
    async createMeeting(m) {
      check(await sb.from(T_REUNIOES).insert(Object.assign({ id: m.id, cliente_id: m.clientId }, meetingPatch(m))));
    },
    async updateMeeting(id, patch) {
      check(await sb.from(T_REUNIOES).update(meetingPatch(patch)).eq('id', id));
    },
    async deleteMeeting(id) {
      check(await sb.from(T_REUNIOES).delete().eq('id', id));
    },
    // Avisa quando alguém (você ou outra pessoa) muda algo no banco
    onChange(cb) {
      sb.channel('squad-mudancas')
        .on('postgres_changes', { event: '*', schema: 'public', table: T_CLIENTES }, cb)
        .on('postgres_changes', { event: '*', schema: 'public', table: T_REUNIOES }, cb)
        .subscribe();
    }
  };
})();
