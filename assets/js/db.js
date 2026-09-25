// Camada de dados: toda conversa com o banco (Supabase) passa por aqui.
// O resto do sistema usa só as funções de window.DB.
(function () {
  const cfg = window.APP_CONFIG;
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
  const T_CLIENTES = 'squad_clientes';
  const T_REUNIOES = 'squad_reunioes';

  const toClient = r => ({ id: r.id, name: r.nome, order: r.ordem, squad: r.squad });
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
