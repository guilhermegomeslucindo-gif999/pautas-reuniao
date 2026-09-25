# Reuniões do Squad D

Sistema da QH4 para registrar as reuniões com os clientes do Squad D. Para cada cliente você abre uma reunião por data, anota as **pautas** e as **ações para aplicar após a reunião**, e tudo fica salvo num banco de dados (Supabase) para consultar depois.

Responsável: Guilherme (account, Squad D).

## O que o sistema faz

- Lista os clientes do Squad D, com busca e campo para cadastrar novos.
- Cada cliente tem suas reuniões separadas por data.
- Cada reunião tem dois campos lado a lado: pautas (texto livre) e ações (lista com caixinha para marcar como feita).
- Mostra quantas ações estão pendentes por cliente e lista as pendências de reuniões anteriores ao abrir uma reunião nova.
- Salva sozinho enquanto você digita. Qualquer pessoa com o link vê e salva no mesmo banco, e as mudanças aparecem para todo mundo em tempo real.

## Estrutura das pastas

```
reunioes-squad-d/
├── index.html                  Página principal
├── assets/
│   ├── css/
│   │   └── styles.css          Visual (cores, fontes, layout)
│   └── js/
│       ├── config.js           Endereço e chave pública do Supabase
│       ├── db.js               Leitura e gravação no banco
│       └── app.js              Telas e comportamento do sistema
├── supabase/
│   ├── migrations/
│   │   └── 001_criar_tabelas.sql   Cria as tabelas e as regras de acesso
│   └── seed.sql                Cadastra os 17 clientes iniciais
├── vercel.json                 Configuração da Vercel
├── .gitignore
└── README.md
```

Não tem etapa de build nem dependências para instalar: são arquivos estáticos (HTML, CSS e JavaScript).

## Banco de dados

O banco já está criado e configurado no projeto Supabase `gxywpcnafudktgmygxbz`, com os 17 clientes cadastrados.

| Tabela | O que guarda |
| --- | --- |
| `squad_clientes` | Clientes (nome, ordem, squad) |
| `squad_reunioes` | Reuniões (cliente, data, assunto, pautas, ações em JSON) |

Excluir um cliente no banco apaga as reuniões dele junto. As tabelas têm o prefixo `squad_` para não misturar com as outras tabelas que já existem nesse projeto.

Para recriar tudo num projeto novo: abra o **SQL Editor** do Supabase, rode `supabase/migrations/001_criar_tabelas.sql` e depois `supabase/seed.sql`. Em seguida troque o endereço e a chave em `assets/js/config.js` (ficam em Project Settings > API Keys; use a chave **publishable**, nunca a secret).

## Como subir no GitHub

1. Crie um repositório novo no GitHub (por exemplo `reunioes-squad-d`). Pode ser privado.
2. Na página do repositório, clique em **uploading an existing file**.
3. Descompacte o `.zip` no seu computador e arraste **o conteúdo** da pasta `reunioes-squad-d` (não a pasta em si) para a página, mantendo as subpastas.
4. Clique em **Commit changes**.

Pelo terminal, se preferir:

```bash
cd reunioes-squad-d
git init
git add .
git commit -m "Sistema de reuniões do Squad D"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/reunioes-squad-d.git
git push -u origin main
```

## Como publicar na Vercel

1. Entre em [vercel.com](https://vercel.com) com a sua conta do GitHub.
2. Clique em **Add New > Project** e importe o repositório `reunioes-squad-d`.
3. Em **Framework Preset**, deixe **Other**. Não precisa mudar Build Command nem Output Directory.
4. Clique em **Deploy**. Em cerca de um minuto a Vercel te dá o link do sistema.

Depois disso, toda alteração que você subir no GitHub é publicada sozinha.

## Segurança: leia antes de compartilhar o link

Por enquanto o sistema **não tem login**. Qualquer pessoa que tiver o link consegue ver, editar e apagar as reuniões. Isso foi escolhido de propósito para a primeira versão, mas:

- compartilhe o link só com quem precisa usar;
- as pautas ficam acessíveis a quem descobrir o endereço;
- o próximo passo recomendado é ativar o login pelo Supabase Auth (e-mail e senha) e trocar as regras de acesso das tabelas para liberar só usuários logados.

## Como mexer no sistema

- **Trocar nome ou função no topo da lateral:** `index.html`, bloco `class="ident"`.
- **Mudar cores:** `assets/css/styles.css`, variáveis no início do arquivo (`--accent` é o verde).
- **Mudar o squad:** `SQUAD` em `assets/js/config.js`. O sistema só mostra clientes desse squad.
