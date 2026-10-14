# ClientX — passo a passo para colocar no ar

Sistema interno de gestão de clientes. Next.js na Vercel + Supabase como banco + backup diário automático no Google Sheets.

## O que já vem de segurança
- Página inicial mostra só o logo. O painel fica num **endereço secreto** (`/acesso-xxxx`); qualquer outro caminho do painel dá "página não encontrada".
- Login do admin com **senha (bcrypt) + 2FA por app autenticador**; códigos 2FA não podem ser reutilizados.
- Formulário protegido por **senha individual** criada no painel (guardada só como hash, com validade opcional).
- **Bloqueio após 5 tentativas erradas** em 15 min (login, 2FA e formulário).
- Banco Supabase com RLS ligado e sem políticas: só o servidor (chave service_role) acessa.
- Backup diário automático na planilha (Vercel Cron, 3h da manhã) e botão "Fazer backup agora" no painel.
- Dados sensíveis gravados no banco e na planilha **criptografados (AES-256-GCM)** — quem abrir a planilha vê texto embaralhado.
- A planilha só é acessada pelo servidor; nenhuma chave vai para o navegador.
- Sessões em cookies `__Host-` httpOnly/secure/strict; expiram em 8h (admin) e 2h (formulário).
- Cabeçalhos de segurança: CSP com nonce, HSTS, anti-iframe, no-referrer, noindex.
- Proteção contra injeção de fórmula na planilha e contra links `javascript:`.
- Registro de atividades (logins, falhas, cadastros, edições) na aba **Log** e no painel.

## 1. Gerar as chaves (no seu computador)
```bash
npm install
npm run setup
```
Ele pede e-mail e senha do admin (mín. 14 caracteres) e cria:
- `.env.local` com as chaves;
- `2fa-qrcode.png` → escaneie no Google Authenticator/Authy e **apague a imagem**;
- o **endereço secreto** do painel (aparece no final).

**Guarde a `ENCRYPTION_KEY` num gerenciador de senhas.** Sem ela os dados não podem ser lidos.

## 2. Supabase
1. No projeto Supabase, abra **SQL Editor → New query**, cole o conteúdo de `supabase/schema.sql` e clique em **Run**.
2. Em **Project Settings → API Keys**, copie a chave **service_role** (secreta) para `SUPABASE_SERVICE_ROLE_KEY`. Nunca use essa chave no navegador.

## 3. Planilha de backup (Google)
1. Crie uma planilha vazia (sheets.new). O ID é o trecho da URL entre `/d/` e `/edit`.
2. console.cloud.google.com → novo projeto → ative a **Google Sheets API**.
3. **IAM → Contas de serviço → Criar** → **Chaves → Adicionar chave → JSON**.
4. Compartilhe a planilha com o `client_email` do JSON como **Editor**.
5. Preencha `SHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL` e `GOOGLE_PRIVATE_KEY` (o `private_key` do JSON) e apague o JSON.
As abas são criadas sozinhas no primeiro backup.

## 4. GitHub e Vercel
1. Crie um repositório **privado** no GitHub e envie o projeto (o `.gitignore` já impede que `.env.local` suba).
2. Na Vercel: **Add New → Project** → importe o repositório.
3. Em **Settings → Environment Variables**, cole cada variável do `.env.local` (exceto comentários).
4. Deploy. O endereço será `seuprojeto.vercel.app`.
5. Recomendado: em **Settings → Deployment Protection**, deixe os previews protegidos.

## 5. Uso
- Painel: `https://seuprojeto.vercel.app/<endereço-secreto>` → e-mail/senha → código 2FA.
- Em **Acessos ao formulário**, crie a senha de quem vai cadastrar e envie a ela, junto com o link `https://seuprojeto.vercel.app/formulario`.

## Cuidados obrigatórios
- Ative o **2FA na conta Google** dona da planilha (app ou chave de segurança, nunca SMS).
- A planilha é só cópia: editar nela não muda o sistema (e é sobrescrita no próximo backup).
- Para derrubar todas as sessões de uma vez: troque o `SESSION_SECRET` na Vercel e faça redeploy.
- Perdeu o celular do 2FA? Rode `npm run setup` de novo (com outro nome de arquivo .env) e troque `ADMIN_TOTP_SECRET` na Vercel. **Não troque a `ENCRYPTION_KEY`.**
