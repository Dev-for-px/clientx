-- ClientX — rode este SQL no Supabase (SQL Editor → New query → Run).
-- O sistema acessa o banco só pelo servidor, com a chave service_role.
-- RLS ligado e SEM políticas = a chave pública (anon) não lê nem grava nada.

create table if not exists public.clientes (
  id text primary key,
  criado_em text, atualizado_em text, criado_por text,
  status text, situacao text, valor_aberto text,
  nome text, responsavel text, whatsapp text, email text,
  signal_tipo text, signal text, cnpj text,
  dominio_site text, dominio_admin text, dominios_extra text,
  taxa_implantacao text, mensalidade text, base_percentual text, percentual text,
  inicio_contrato text, condicoes text,
  dia_fatura text, vencimento_dias text, meio_pagamento text, gerente text,
  grupo_whatsapp text, grupo_signal text, ultimo_pagamento text
);

create table if not exists public.acessos (
  id text primary key,
  nome text, senha_hash text, ativo text, criado_em text,
  validade text, ultimo_uso text, cadastros text
);

create table if not exists public.tentativas (
  seq bigserial primary key,
  quando text, tipo text, chave text, sucesso text
);
create index if not exists tentativas_busca on public.tentativas (tipo, chave, quando);

create table if not exists public.log (
  seq bigserial primary key,
  quando text, quem text, acao text, detalhe text, ip_hash text
);

alter table public.clientes   enable row level security;
alter table public.acessos    enable row level security;
alter table public.tentativas enable row level security;
alter table public.log        enable row level security;

-- Garante que as chaves públicas não tenham nenhum acesso.
revoke all on public.clientes, public.acessos, public.tentativas, public.log from anon, authenticated;

-- Equipe (membros com login próprio + 2FA)
create table if not exists public.usuarios (
  id text primary key,
  nome text, email_hash text unique, email text, senha_hash text, totp_secret text,
  papel text, ativo text, criado_em text, ultimo_login text
);
alter table public.usuarios enable row level security;
revoke all on public.usuarios from anon, authenticated;

-- Configurações do sistema (ex.: formulário exige senha)
create table if not exists public.config (
  id text primary key, valor text, criado_em text
);
alter table public.config enable row level security;
revoke all on public.config from anon, authenticated;
