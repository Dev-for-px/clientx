# ClientX — passo a passo para colocar no ar

Sistema interno de gestão de clientes. Next.js na Vercel + Google Sheets como banco.

## O que já vem de segurança
- Página inicial mostra só o logo. O painel fica num **endereço secreto** (`/acesso-xxxx`); qualquer outro caminho do painel dá "página não encontrada".
- Login do admin com **senha (bcrypt) + 2FA por app autenticador**; códigos 2FA não podem ser reutilizados.
- Formulário protegido por **senha individual** criada no painel (guardada só como hash, com validade opcional).
- **Bloqueio após 5 tentativas erradas** em 15 min (login, 2FA e formulário).
- Dados sensíveis gravados na planilha **criptografados (AES-256-GCM)** — quem abrir a planilha vê texto embaralhado.
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

## 2. Criar a planilha e o "robô" do Google
1. Crie uma planilha vazia no Google Sheets. O ID é o trecho da URL entre `/d/` e `/edit`.
2. Acesse console.cloud.google.com → crie um projeto → **APIs e serviços → Ativar APIs** → ative **Google Sheets API**.
3. **IAM → Contas de serviço → Criar**. Depois, em **Chaves → Adicionar chave → JSON**. Baixe o arquivo.
4. Na planilha, clique em **Compartilhar** e adicione o e-mail da conta de serviço (`...@...iam.gserviceaccount.com`) como **Editor**. Não compartilhe com mais ninguém.
5. No `.env.local`, preencha:
   - `SHEET_ID=` o ID da planilha
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL=` o `client_email` do JSON
   - `GOOGLE_PRIVATE_KEY=` o `private_key` do JSON, entre aspas, com os `\n`
6. Rode `npm run init-sheet` — cria as abas Clientes, Acessos, Tentativas e Log.
7. **Apague o arquivo JSON** baixado.

## 3. GitHub e Vercel
1. Crie um repositório **privado** no GitHub e envie o projeto (o `.gitignore` já impede que `.env.local` suba).
2. Na Vercel: **Add New → Project** → importe o repositório.
3. Em **Settings → Environment Variables**, cole cada variável do `.env.local` (exceto comentários).
4. Deploy. O endereço será `seuprojeto.vercel.app`.
5. Recomendado: em **Settings → Deployment Protection**, deixe os previews protegidos.

## 4. Uso
- Painel: `https://seuprojeto.vercel.app/<endereço-secreto>` → e-mail/senha → código 2FA.
- Em **Acessos ao formulário**, crie a senha de quem vai cadastrar e envie a ela, junto com o link `https://seuprojeto.vercel.app/formulario`.

## Cuidados obrigatórios
- Ative o **2FA na conta Google** dona da planilha (app ou chave de segurança, nunca SMS).
- Não edite a planilha à mão (as abas estão marcadas com aviso).
- Para derrubar todas as sessões de uma vez: troque o `SESSION_SECRET` na Vercel e faça redeploy.
- Perdeu o celular do 2FA? Rode `npm run setup` de novo (com outro nome de arquivo .env) e troque `ADMIN_TOTP_SECRET` na Vercel. **Não troque a `ENCRYPTION_KEY`.**
