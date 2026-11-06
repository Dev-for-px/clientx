# ClientX — contexto para o Claude Code

Sistema interno de gestão de clientes (formulário de cadastro + painel). Usuário: Pedro (PerformanceX). Responder em português.

## Stack
- Next.js 14 (App Router, TypeScript), deploy na Vercel (projeto `clientx`, https://clientx-lac.vercel.app).
- Banco: Supabase via REST com `SUPABASE_SERVICE_ROLE_KEY` só no servidor (`src/lib/db.ts`). RLS ligado sem políticas. Schema em `supabase/schema.sql`.
- Backup diário (Vercel Cron 06:00 UTC → `/api/backup`) para planilha Google via Apps Script (`apps-script/Backup.gs`, `src/lib/sheets.ts`). Sem Google Cloud.

## Segurança (não regredir)
- Painel só por endereço secreto `ADMIN_PATH` (middleware gera cookie "gate"); demais rotas do painel dão 404.
- Login: senha bcrypt + 2FA TOTP; códigos não reutilizáveis; bloqueio 5 tentativas/15 min.
- 2FA, endereço secreto e bloqueio são opcionais (página Segurança, só o dono; config `seg_2fa`, `seg_caminho`, `seg_bloqueio`; padrão ligado). Com endereço secreto desligado, login em `/entrar`.
- Dono = credenciais nas env vars. Equipe = tabela `usuarios`; permissões na coluna `papel` como `membro:perm1,perm2` (`src/lib/perms.ts`: clientes_editar, clientes_excluir, acessos, log; `membro` sozinho = clientes_editar). Ver clientes é sempre liberado; Equipe, backup e limpar o Log só o dono. Ações usam `requirePerm`/`requireOwner`.
- Formulário: com senha (tabela `acessos`, bcrypt) ou sem senha (config `form_senha`), limite 15 cadastros/15 min sem senha.
- Campos sensíveis criptografados AES-256-GCM (`src/lib/crypto.ts`, lista em `src/lib/clients.ts`). Nunca trocar `ENCRYPTION_KEY`.
- CSP com nonce no middleware, cookies `__Host-`, server actions sempre revalidam sessão.

## Cassino (/cassino)
- Área de gestão das casas de apostas no mesmo app e no mesmo Supabase: `src/app/cassino/(app)` (Casas, Fechamento de GGR, Integrações), `src/lib/casino.ts`, `src/lib/casino-fields.ts`, `src/app/actions/casino.ts`.
- Tabelas: `casas`, `integracoes` (catálogo cadastrável, semeado na 1ª leitura), `casa_integracoes` (status/taxa/credenciais criptografadas por casa), `ggr` (fechamento por período; a pagar = GGR × % da casa + servidor opcional, ou valor manual).
- Mesmo login/sessão do painel. Entrada: `/<ADMIN_PATH>/cassino` (endereço secreto ligado) ou `/cassino/login` (endereço secreto desligado). Cookie `__Host-cx_dest` leva ao /cassino após o login.
- Permissões novas: `cassino_ver`, `cassino_editar` (dono tem todas). Integrações só o dono. Credenciais só aparecem para quem tem `cassino_editar`.

## Git / deploy
- Commits DEVEM ter autor `PerformanceX <peformance.estrategia@gmail.com>` — senão a Vercel (Hobby) bloqueia o deploy.
- Push na `main` publica automaticamente.

## Pendências
- Backup refeito (Apps Script v2, com `autorizar` e diagnóstico em `doGet`): reinstalar a planilha do zero seguindo o LEIA-ME §3 e testar pelo botão no Log.
- Opcional: trocar domínio (`clientx.vercel.app` já é de outro projeto).

## Feito (2026-10-14)
- Tabelas `usuarios` e `config` confirmadas no Supabase (6 tabelas, RLS ligado).
- Acesso ao painel confirmado após a correção de sessão antiga.
- Equipe e acessos editáveis/excluíveis, permissões por membro, limpeza do Log e edição de clientes publicados e testados no site.

## Testes
`SUPABASE_URL=local` + `ALLOW_LOCAL_STORE=1` usa arquivo `.data/db.json` (só para teste local).
