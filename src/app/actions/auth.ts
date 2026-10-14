"use server";

import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { COOKIES, cookieOpts, sign, verify } from "@/lib/jwt";
import { audit, isLocked, recordAttempt, slow } from "@/lib/auth";
import { append, readAll, recentAttempts, updateById } from "@/lib/db";
import { safeEqual, sha256 } from "@/lib/crypto";

export type State = { error?: string };

const LOCK_MSG = "Muitas tentativas. Aguarde 15 minutos e tente de novo.";

export async function adminLogin(_: State, fd: FormData): Promise<State> {
  if (!(await verify("gate", cookies().get(COOKIES.gate)?.value))) redirect("/");
  if (await isLocked("admin")) return { error: LOCK_MSG };

  const email = String(fd.get("email") ?? "").trim().toLowerCase().slice(0, 200);
  const senha = String(fd.get("senha") ?? "").slice(0, 200);

  const emailOk = safeEqual(sha256(email), sha256(env.adminEmail));
  const senhaOk = await bcrypt.compare(senha, env.adminPasswordHash);
  await slow();

  if (!emailOk || !senhaOk) {
    await recordAttempt("admin", false);
    await audit("desconhecido", "login_falhou");
    return { error: "E-mail ou senha incorretos." };
  }
  cookies().set(COOKIES.pre, await sign("pre"), cookieOpts("pre"));
  redirect("/painel/2fa");
}

export async function adminVerify2fa(_: State, fd: FormData): Promise<State> {
  if (!(await verify("pre", cookies().get(COOKIES.pre)?.value))) redirect("/");
  if (await isLocked("2fa")) return { error: LOCK_MSG };

  const code = String(fd.get("codigo") ?? "").replace(/\D/g, "").slice(0, 6);
  authenticator.options = { window: 1 };
  const valid = code.length === 6 && authenticator.check(code, env.adminTotpSecret);

  // Um código não pode ser usado duas vezes (proteção contra repetição).
  const reused =
    valid &&
    (await recentAttempts("totp_usado", sha256(code), new Date(Date.now() - 120_000).toISOString())).length > 0;
  await slow();

  if (!valid || reused) {
    await recordAttempt("2fa", false);
    await audit("admin", "2fa_falhou");
    return { error: "Código inválido ou expirado." };
  }
  await recordAttempt("2fa", true);
  await append("Tentativas", {
    quando: new Date().toISOString(),
    tipo: "totp_usado",
    chave: sha256(code),
    sucesso: "sim",
  });
  const jar = cookies();
  jar.delete(COOKIES.pre);
  jar.delete(COOKIES.gate);
  jar.set(COOKIES.admin, await sign("admin", { sub: "admin" }), cookieOpts("admin"));
  await audit("admin", "login_ok");
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
