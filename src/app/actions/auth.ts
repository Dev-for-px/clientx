"use server";

import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { COOKIES, cookieOpts, sign, verify } from "@/lib/jwt";
import { audit, isLocked, recordAttempt, slow } from "@/lib/auth";
import { append, readAll, recentAttempts, updateById } from "@/lib/db";
import { decrypt, safeEqual, sha256 } from "@/lib/crypto";

export type State = { error?: string };

const LOCK_MSG = "Muitas tentativas. Aguarde 15 minutos e tente de novo.";

// Hash fixo para comparar mesmo quando o e-mail não existe (não revela quem tem conta).
const DUMMY_HASH = "$2a$12$wxhq7FDLcsPfxRiCurbgme4eY6ZsxAEMX95b.2SDdTAUxz7e45nkK";

export async function adminLogin(_: State, fd: FormData): Promise<State> {
  if (!(await verify("gate", cookies().get(COOKIES.gate)?.value))) redirect("/");
  if (await isLocked("admin")) return { error: LOCK_MSG };

  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const senha = String(fd.get("senha") ?? "").slice(0, 200);

  let sub = "";
  if (safeEqual(sha256(email), sha256(env.adminEmail))) {
    if (await bcrypt.compare(senha, env.adminPasswordHash)) sub = "dono";
  } else {
    const u = (await readAll("Usuarios")).find((x) => x.email_hash === sha256(email) && x.ativo === "sim");
    const ok = await bcrypt.compare(senha, u?.senha_hash || DUMMY_HASH);
    if (u && ok) sub = u.id;
  }
  await slow();

  if (!sub) {
    await recordAttempt("admin", false);
    await audit("desconhecido", "login_falhou");
    return { error: "E-mail ou senha incorretos." };
  }
  cookies().set(COOKIES.pre, await sign("pre", { sub }), cookieOpts("pre"));
  redirect("/painel/2fa");
}

export async function adminVerify2fa(_: State, fd: FormData): Promise<State> {
  const pre = await verify("pre", cookies().get(COOKIES.pre)?.value);
  if (!pre || typeof pre.sub !== "string") redirect("/");
  if (await isLocked("2fa")) return { error: LOCK_MSG };

  let secret = "", nome = "", papel: "dono" | "membro" = "membro";
  if (pre.sub === "dono") {
    secret = env.adminTotpSecret; nome = "Dono"; papel = "dono";
  } else {
    const u = (await readAll("Usuarios")).find((x) => x.id === pre.sub && x.ativo === "sim");
    if (!u) redirect("/");
    secret = decrypt(u.totp_secret); nome = u.nome;
  }

  const code = String(fd.get("codigo") ?? "").replace(/\D/g, "").slice(0, 6);
  authenticator.options = { window: 1 };
  const valid = code.length === 6 && authenticator.check(code, secret);
  const key = sha256(pre.sub + ":" + code);

  // Um código não pode ser usado duas vezes (proteção contra repetição).
  const reused = valid && (await recentAttempts("totp_usado", key, new Date(Date.now() - 120_000).toISOString())).length > 0;
  await slow();

  if (!valid || reused) {
    await recordAttempt("2fa", false);
    await audit(nome, "2fa_falhou");
    return { error: "Código inválido ou expirado." };
  }
  await recordAttempt("2fa", true);
  await append("Tentativas", { quando: new Date().toISOString(), tipo: "totp_usado", chave: key, sucesso: "sim" });
  if (papel === "membro") await updateById("Usuarios", pre.sub, { ultimo_login: new Date().toISOString() });

  const jar = cookies();
  jar.delete(COOKIES.pre);
  jar.delete(COOKIES.gate);
  jar.set(COOKIES.admin, await sign("admin", { sub: pre.sub, papel, nome }), cookieOpts("admin"));
  await audit(nome, "login_ok");
  redirect("/painel");
}

export async function adminLogout() {
  const jar = cookies();
  jar.delete(COOKIES.admin);
  jar.delete(COOKIES.gate);
  redirect("/");
}

export async function formUnlock(_: State, fd: FormData): Promise<State> {
  if (await isLocked("form")) return { error: LOCK_MSG };
  const senha = String(fd.get("senha") ?? "").slice(0, 200);
  const hoje = new Date().toISOString().slice(0, 10);

  const ativos = (await readAll("Acessos")).filter((a) => a.ativo === "sim" && (!a.validade || a.validade >= hoje));
  let achado = null;
  for (const a of ativos) {
    if (await bcrypt.compare(senha, a.senha_hash)) {
      achado = a;
      break;
    }
  }
  await slow();

  if (!achado) {
    await recordAttempt("form", false);
    await audit("desconhecido", "senha_formulario_falhou");
    return { error: "Senha incorreta ou acesso desativado." };
  }
  await recordAttempt("form", true);
  await updateById("Acessos", achado.id, { ultimo_uso: new Date().toISOString() });
  await audit(achado.nome, "formulario_acesso");
  cookies().set(COOKIES.form, await sign("form", { acesso: achado.id, nome: achado.nome }), cookieOpts("form"));
  redirect("/formulario/novo");
}

export async function formLogout() {
  cookies().delete(COOKIES.form);
  redirect("/formulario");
}

// Entrada no formulário quando o dono desligou a exigência de senha.
export async function formOpen() {
  const { getConfig } = await import("@/lib/db");
  if ((await getConfig("form_senha", "sim")) !== "nao") redirect("/formulario");
  cookies().set(COOKIES.form, await sign("form", { acesso: "livre", nome: "Acesso livre" }), cookieOpts("form"));
  await audit("Acesso livre", "formulario_acesso");
  redirect("/formulario/novo");
}
