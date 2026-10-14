import { NextResponse, type NextRequest } from "next/server";
import { COOKIES, cookieOpts, sign, verify } from "@/lib/jwt";

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

function notFound(req: NextRequest) {
  return NextResponse.rewrite(new URL("/nao-encontrado", req.url), { status: 404 });
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const adminPath = process.env.ADMIN_PATH ?? "";
  const c = req.cookies;

  // 1) Endereço secreto do painel: libera a tela de login por 30 min.
  if (adminPath.length >= 8 && pathname === `/${adminPath}`) {
    const res = NextResponse.redirect(new URL("/painel/entrar", req.url));
    res.cookies.set(COOKIES.gate, await sign("gate"), cookieOpts("gate"));
    return res;
  }

  let block: NextResponse | null = null;

  if (pathname.startsWith("/painel")) {
    const admin = await verify("admin", c.get(COOKIES.admin)?.value);
    const gate = await verify("gate", c.get(COOKIES.gate)?.value);
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
