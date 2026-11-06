import { NextResponse, type NextRequest } from "next/server";
import { COOKIES, DEST, cookieOpts, sign, verify } from "@/lib/jwt";

function csp(nonce: string) {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// Lê no banco se o endereço secreto está ligado (cache curto, roda no edge).
let cache: { v: boolean; t: number } | null = null;
async function secretPathOn(): Promise<boolean> {
  const url = process.env.SUPABASE_URL ?? "";
  if (url === "local") return process.env.LOCAL_SEG_CAMINHO !== "nao";
  if (cache && Date.now() - cache.t < 30_000) return cache.v;
  let v = true; // na dúvida, mantém protegido
  try {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
    const r = await fetch(`${url}/rest/v1/config?select=valor&id=eq.seg_caminho`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    });
    if (r.ok) v = ((await r.json()) as { valor: string }[])[0]?.valor !== "nao";
  } catch { /* mantém ligado */ }
  cache = { v, t: Date.now() };
  return v;
}

function notFound(req: NextRequest) {
  return NextResponse.rewrite(new URL("/nao-encontrado", req.url), { status: 404 });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adminPath = process.env.ADMIN_PATH ?? "";
  const c = req.cookies;

  // 1) Endereço secreto do painel: libera a tela de login por 30 min.
  //    /<secreto>/cassino faz o mesmo e, depois do login, leva ao Cassino.
  if (adminPath.length >= 8 && (pathname === `/${adminPath}` || pathname === `/${adminPath}/cassino`)) {
    const res = NextResponse.redirect(new URL("/painel/entrar", req.url));
    res.cookies.set(COOKIES.gate, await sign("gate"), cookieOpts("gate"));
    if (pathname.endsWith("/cassino")) res.cookies.set(DEST, "cassino", { ...cookieOpts("gate"), httpOnly: true });
    else res.cookies.delete(DEST);
    return res;
  }

  // Login do Cassino: segue a mesma regra do /entrar (só quando o endereço secreto está desligado).
  if (pathname === "/cassino/login") {
    if (await secretPathOn()) return notFound(req);
    const admin = await verify("admin", c.get(COOKIES.admin)?.value);
    const res = NextResponse.redirect(new URL(admin ? "/cassino" : "/painel/entrar", req.url));
    if (!admin) {
      res.cookies.set(COOKIES.gate, await sign("gate"), cookieOpts("gate"));
      res.cookies.set(DEST, "cassino", { ...cookieOpts("gate"), httpOnly: true });
    }
    return res;
  }

  // Área do Cassino: exige sessão do painel.
  if (pathname === "/cassino" || pathname.startsWith("/cassino/")) {
    const admin = await verify("admin", c.get(COOKIES.admin)?.value);
    if (!admin) return (await secretPathOn()) ? notFound(req) : NextResponse.redirect(new URL("/cassino/login", req.url));
  }

  // Endereço secreto desligado: o login fica em /entrar.
  if (pathname === "/entrar") {
    if (await secretPathOn()) return notFound(req);
    const res = NextResponse.redirect(new URL("/painel/entrar", req.url));
    res.cookies.set(COOKIES.gate, await sign("gate"), cookieOpts("gate"));
    res.cookies.delete(DEST);
    return res;
  }

  let block: NextResponse | null = null;

  if (pathname.startsWith("/painel")) {
    const admin = await verify("admin", c.get(COOKIES.admin)?.value);
    const gate = (await verify("gate", c.get(COOKIES.gate)?.value)) || (!admin && !(await secretPathOn()));
    const pre = await verify("pre", c.get(COOKIES.pre)?.value);
    if (pathname === "/painel/entrar") {
      if (admin) block = NextResponse.redirect(new URL("/painel", req.url));
      else if (!gate) block = notFound(req);
    } else if (pathname === "/painel/2fa") {
      if (!pre) block = gate ? NextResponse.redirect(new URL("/painel/entrar", req.url)) : notFound(req);
    } else if (!admin) {
      block = gate ? NextResponse.redirect(new URL("/painel/entrar", req.url)) : notFound(req);
    }
  }

  if (pathname.startsWith("/formulario/novo")) {
    const form = await verify("form", c.get(COOKIES.form)?.value);
    if (!form) block = NextResponse.redirect(new URL("/formulario", req.url));
  }

  if (block) return block;

  // 2) CSP com nonce por requisição.
  const nonce = btoa(crypto.randomUUID());
  const headers = new Headers(req.headers);
  headers.set("x-nonce", nonce);
  headers.set("content-security-policy", csp(nonce)); // o Next lê o nonce daqui
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp(nonce));
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
