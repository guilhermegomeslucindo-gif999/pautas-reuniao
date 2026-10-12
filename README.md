# Squad D · Painel

Painel do Squad D com dois modos, alternados pelo seletor no topo da lateral:

- **Reuniões**: pautas e ações pós-reunião de cada cliente, uma aba por data.
- **Lembretes**: lista de pontos para fazer por cliente, com checkbox. Enter cria a próxima linha.

A lista de clientes é a mesma nos dois modos. Dá para cadastrar, renomear (clicando no nome no topo) e excluir clientes.

## Onde os dados ficam

O painel é um site estático (um único `index.html`, sem build). Os dados ficam salvos no **navegador** (localStorage) de quem usa.

Isso quer dizer:

- Cada navegador/dispositivo tem os próprios dados. O que você anota no computador não aparece no celular.
- Se limpar os dados do navegador ou usar aba anônima, as anotações somem.
- Use **Exportar backup** (rodapé da lateral) com frequência. Para levar os dados para outro dispositivo, exporte em um e use **Importar backup** no outro.

## Subir no GitHub e na Vercel

1. Crie um repositório no GitHub e envie os arquivos desta pasta (`index.html`, `vercel.json`, `README.md`).
2. Na Vercel: **Add New → Project**, importe o repositório.
3. Framework Preset: **Other**. Não precisa de comando de build nem de pasta de saída.
4. Clique em **Deploy**.

Os dados das reuniões ficam só no navegador, nunca no repositório. Se o repositório for público, não faça commit de arquivos de backup (`backup-squad-d-*.json`); o `.gitignore` já bloqueia esses arquivos.
