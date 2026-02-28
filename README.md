# SGD — Sistema de Gestão de Dispositivos

## Estrutura de arquivos

```
sgd/
├── index.html                        → tela de login
├── catalogo.html                     → catálogo de dispositivos
├── netlify.toml
├── package.json
├── netlify/
│   └── functions/
│       ├── login.js                  → valida senha e retorna token de sessão
│       ├── dados.js                  → busca dispositivos do Google Drive
│       ├── verificar-admin.js        → valida senha admin e retorna adminToken
│       ├── listar-manuais.js         → lista dispositivos do Supabase
│       ├── inserir-dispositivo.js    → salva novo dispositivo no Supabase
│       └── upload-imagem.js          → faz upload da foto para Supabase Storage
└── Imagens/
    ├── 1.png                         → imagem da tela de loading
    └── holder-dispositivos.png       → placeholder sem foto
```

## Variáveis de ambiente no Netlify

Configure as seguintes variáveis em **Site settings → Environment variables**:

| Variável           | Descrição                                      |
|--------------------|------------------------------------------------|
| `SENHA_ACESSO`     | Senha de acesso ao painel (usuário comum)      |
| `SENHA_ADMIN`      | Senha para inserir dispositivos (admin)        |
| `GOOGLE_FILE_ID`   | ID do arquivo JSON no Google Drive             |
| `GOOGLE_API_KEY`   | Chave de API do Google                         |
| `SUPABASE_URL`     | URL do projeto Supabase (API URL)              |
| `SUPABASE_ANON_KEY`| Chave anon public do Supabase                  |

## Setup do Supabase

1. Tabela `dispositivos` com colunas:
   - `id` (int8, primary key, auto-increment)
   - `nome` (text)
   - `descricao` (text)
   - `categoria` (text)
   - `imagem_url` (text, nullable)
   - `created_at` (timestamptz, default: now())

2. Bucket `fotos` — público

## Como fazer o deploy

1. Crie um repositório no GitHub e suba esta pasta
2. Conecte o repositório ao Netlify
3. Configure as variáveis de ambiente
4. Deploy automático!
