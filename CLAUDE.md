# ClientX — contexto para o Claude Code

Sistema interno de gestão de clientes (formulário de cadastro + painel). Usuário: Pedro (PerformanceX). Responder em português.

## Stack
- Next.js 14 (App Router, TypeScript), deploy na Vercel (projeto `clientx`, https://clientx-lac.vercel.app).
- Banco: Supabase via REST com `SUPABASE_SERVICE_ROLE_KEY` só no servidor (`src/lib/db.ts`). RLS ligado sem políticas. Schema em `supabase/schema.sql`.
- Backup diário (Vercel Cron 06:00 UTC → `/api/backup`) para planilha Google via Apps Script (`apps-script/Backup.gs`, `src/lib/sheets.ts`). Sem Google Cloud.

## Segurança (não regredir)
- Painel só por endereço secreto `ADMIN_PATH` (middleware gera cookie "gate"); demais rotas do painel dão 404.
- Login: senha bcrypt + 2FA TOTP; códigos não reutilizáveis; bloqueio 5 tentativas/15 min.
- Dono = credenciais nas env vars. Equipe = tabela `usuarios` (papel membro: vê/edita clientes; Equipe, Acessos e Log só o dono).
- Formulário: com senha (tabela `acessos`, bcrypt) ou sem senha (config `form_senha`), limite 15 cadastros/15 min sem senha.
- Campos sensíveis criptografados AES-256-GCM (`src/lib/crypto.ts`, lista em `src/lib/clients.ts`). Nunca trocar `ENCRYPTION_KEY`.
- CSP com nonce no middleware, cookies `__Host-`, server actions sempre revalidam sessão.

## Git / deploy
- Commits DEVEM ter autor `PerformanceX <peformance.estrategia@gmail.com>` — senão a Vercel (Hobby) bloqueia o deploy.
- Push na `main` publica automaticamente.

## Pendências
- Confirmar que o SQL das tabelas `usuarios` e `config` foi rodado no Supabase.
- Confirmar acesso ao painel após correção de sessão antiga (commit "Mantém sessões do dono...").
- Backup: Apps Script deu erro "OAuth client is not fully created yet" (aguardar/autorizar `doGet`), depois definir `APPS_SCRIPT_URL` e `BACKUP_TOKEN` na Vercel e Redeploy.
- Opcional: trocar domínio (`clientx.vercel.app` já é de outro projeto).

## Testes
`SUPABASE_URL=local` + `ALLOW_LOCAL_STORE=1` usa arquivo `.data/db.json` (só para teste local).
