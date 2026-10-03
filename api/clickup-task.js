// Função da Vercel que cria uma tarefa no ClickUp.
// A chave do ClickUp fica guardada na variável de ambiente CLICKUP_TOKEN
// (configurada no painel da Vercel), nunca no código da página.
//
// Padrão de toda tarefa criada:
// - Lista: a lista do cliente (enviada pela página)
// - Nome: "Nome do cliente - Ação" (montado pela página)
// - Data de entrega: o dia em que a tarefa foi enviada
// - Responsável: o dono da chave do ClickUp (Guilherme)
const API = 'https://api.clickup.com/api/v2';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }
  const token = process.env.CLICKUP_TOKEN;
  if (!token) {
    res.status(500).json({ error: 'A chave do ClickUp (CLICKUP_TOKEN) ainda não foi configurada na Vercel.' });
    return;
  }

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  const listId = String(body.listId || '').trim();
  const name = String(body.name || '').trim().slice(0, 500);
  const description = String(body.description || '').slice(0, 5000);
  let dueDate = Number(body.dueDate);
  if (!Number.isFinite(dueDate) || dueDate <= 0) dueDate = Date.now();

  if (!/^\d+$/.test(listId)) { res.status(400).json({ error: 'Lista do ClickUp inválida.' }); return; }
  if (!name) { res.status(400).json({ error: 'A ação está vazia.' }); return; }

  const headers = { Authorization: token, 'Content-Type': 'application/json' };

  try {
    // Descobre quem é o dono da chave para colocá-lo como responsável
    const u = await fetch(`${API}/user`, { headers });
    if (u.status === 401) {
      res.status(502).json({ error: 'A chave do ClickUp é inválida ou expirou. Gere outra e atualize na Vercel.' });
      return;
    }
    const uj = await u.json().catch(() => ({}));
    const ownerId = uj && uj.user && uj.user.id;

    const task = { name, description, due_date: dueDate, due_date_time: false };
    if (ownerId) task.assignees = [ownerId];

    const r = await fetch(`${API}/list/${listId}/task`, { method: 'POST', headers, body: JSON.stringify(task) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      let msg = j.err || 'O ClickUp recusou a tarefa.';
      if (r.status === 401) msg = 'A chave do ClickUp é inválida ou expirou. Gere outra e atualize na Vercel.';
      else if (r.status === 404 || r.status === 400) msg = 'Lista do ClickUp não encontrada. Confira o link da lista deste cliente.';
      res.status(502).json({ error: msg });
      return;
    }
    res.status(200).json({ id: j.id, url: j.url });
  } catch (e) {
    res.status(502).json({ error: 'Não foi possível falar com o ClickUp. Tente de novo.' });
  }
};
