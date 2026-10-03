// Função da Vercel que descobre qual lista do ClickUp está por trás de um link.
// Aceita os vários formatos de link do ClickUp:
//   .../v/li/901712345678           (link direto da lista)
//   .../v/l/8cqbp4k-52237           (link de uma visualização da lista)
//   .../v/l/6-901712345678-1        (formato antigo)
// Devolve o ID e o nome da lista, para o sistema guardar no cliente.
const API = 'https://api.clickup.com/api/v2';

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Método não permitido.' }); return; }
  const token = process.env.CLICKUP_TOKEN;
  if (!token) { res.status(500).json({ error: 'A chave do ClickUp (CLICKUP_TOKEN) ainda não foi configurada na Vercel. Faça os passos 2, 3 e 4 antes de conectar as listas.' }); return; }

  let body = req.body || {};
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  const link = String(body.link || '').trim();
  const headers = { Authorization: token };

  let listId = null, viewId = null, m;
  if ((m = link.match(/\/li\/(\d+)/))) listId = m[1];
  else if ((m = link.match(/\/v\/[a-z]+\/\d+-(\d+)-\d+/))) listId = m[1];
  else if ((m = link.match(/\/v\/[a-z]+\/([0-9a-z]+-\d+)/i))) viewId = m[1];
  else if ((m = link.match(/^(\d+)$/))) listId = m[1];

  if (!listId && !viewId) { res.status(400).json({ error: 'Não reconheci esse link. Abra a lista do cliente no ClickUp e copie o endereço do navegador.' }); return; }

  try {
    if (viewId) {
      const v = await fetch(`${API}/view/${encodeURIComponent(viewId)}`, { headers });
      if (v.status === 401) { res.status(502).json({ error: 'A chave do ClickUp é inválida ou expirou. Gere outra e atualize na Vercel.' }); return; }
      const vj = await v.json().catch(() => ({}));
      const parent = vj && vj.view && vj.view.parent;
      if (!v.ok || !parent) { res.status(404).json({ error: 'Não encontrei essa lista no ClickUp. Confira se o link é da lista do cliente.' }); return; }
      if (Number(parent.type) !== 6) { res.status(400).json({ error: 'Esse link é de uma pasta ou espaço, não de uma lista. Abra a lista do cliente e copie o link dela.' }); return; }
      listId = String(parent.id);
    }
    const l = await fetch(`${API}/list/${listId}`, { headers });
    if (l.status === 401) { res.status(502).json({ error: 'A chave do ClickUp é inválida ou expirou. Gere outra e atualize na Vercel.' }); return; }
    const lj = await l.json().catch(() => ({}));
    if (!l.ok) { res.status(404).json({ error: 'Não encontrei essa lista no ClickUp. Confira se a sua conta tem acesso a ela.' }); return; }
    res.status(200).json({ listId: String(lj.id || listId), listName: lj.name || '' });
  } catch (e) {
    res.status(502).json({ error: 'Não foi possível falar com o ClickUp. Tente de novo.' });
  }
};
