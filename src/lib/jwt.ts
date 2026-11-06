// Edge-safe (usado também no middleware). Tokens assinados com HS256.
import { SignJWT, jwtVerify, type JWTPayload } from "jose";

export const COOKIES = {
  gate: "__Host-cx_gate",
  pre: "__Host-cx_pre",
  admin: "__Host-cx_admin",
  form: "__Host-cx_form",
} as const;

// Para onde ir depois do login ("cassino" ou vazio = painel).
export const DEST = "__Host-cx_dest";

export const TTL = { gate: 30 * 60, pre: 5 * 60, admin: 8 * 60 * 60, form: 2 * 60 * 60 } as const;

export type Kind = keyof typeof COOKIES;

function key() {
  const s = process.env.SESSION_SECRET ?? "";
  if (s.length < 43) throw new Error("SESSION_SECRET inválido");
  return new TextEncoder().encode(s);
}

export async function sign(kind: Kind, data: Record<string, string> = {}) {
  return new SignJWT({ ...data, k: kind })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TTL[kind]}s`)
    .setAudience("clientx")
    .sign(key());
}

export async function verify(kind: Kind, token?: string): Promise<JWTPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { audience: "clientx", algorithms: ["HS256"] });
    return payload.k === kind ? payload : null;
  } catch {
    return null;
  }
}

export const cookieOpts = (kind: Kind) => ({
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge: TTL[kind],
});
